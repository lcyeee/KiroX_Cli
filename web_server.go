package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	fhttp "github.com/bogdanfinn/fhttp"

	"reg_go/internal/core"
	"reg_go/internal/email"
	httputil2 "reg_go/internal/http"
)

//go:embed web/*
var webFiles embed.FS

// WebServer 网页端服务器
type WebServer struct {
	port   string
	config *ServerConfig
	tasks  map[string]*Task
	mu     sync.RWMutex
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Proxy       string `json:"proxy"`
	MoEmailURL  string `json:"mo_email_url"`
	MoEmailKey  string `json:"mo_email_key"`
	UseOutlook  bool   `json:"use_outlook"`
	OutlookCSV  string `json:"outlook_csv"`
	Delay       int    `json:"delay"`
	OutputPath  string `json:"output_path"`
}

// RegisterRequest 注册请求
type RegisterRequest struct {
	Count       int    `json:"count"`
	Concurrency int    `json:"concurrency"`
	Proxy       string `json:"proxy"`
	Delay       int    `json:"delay"`
	UseOutlook  bool   `json:"use_outlook"`
	MoEmailURL  string `json:"mo_email_url"`
	MoEmailKey  string `json:"mo_email_key"`
}

// Task 注册任务
type Task struct {
	ID        string                   `json:"id"`
	Status    string                   `json:"status"`
	Count     int                      `json:"count"`
	Progress  int                      `json:"progress"`
	Success   int                      `json:"success"`
	Failed    int                      `json:"failed"`
	Results   []map[string]interface{} `json:"results"`
	Logs      []string                 `json:"logs"`
	StartTime time.Time                `json:"start_time"`
	EndTime   *time.Time               `json:"end_time,omitempty"`
	cancel    chan struct{}
}

// NewWebServer 创建网页端服务器
func NewWebServer(port string) *WebServer {
	return &WebServer{
		port: port,
		config: &ServerConfig{
			Proxy:      "",
			MoEmailURL: "https://api.moemail.app",
			MoEmailKey: "",
			UseOutlook: false,
			OutlookCSV: "outlook.csv",
			Delay:      3,
			OutputPath: filepath.Join(".", "output", "results.json"),
		},
		tasks: make(map[string]*Task),
	}
}

// Run 启动服务器
func (ws *WebServer) Run() {
	mux := http.NewServeMux()

	// API 路由（先注册，确保优先匹配）
	mux.HandleFunc("/api/config", ws.handleConfig)
	mux.HandleFunc("/api/register", ws.handleRegister)
	mux.HandleFunc("/api/tasks", ws.handleTasks)
	mux.HandleFunc("/api/task/", ws.handleTaskDetail)
	mux.HandleFunc("/api/results", ws.handleResults)
	mux.HandleFunc("/api/results/stats", ws.handleStats)
	mux.HandleFunc("/api/results/clear", ws.handleClearResults)
	mux.HandleFunc("/api/outlook-csv", ws.handleOutlookCSV)
	mux.HandleFunc("/api/ip-check", ws.handleIPCheck)
	mux.HandleFunc("/api/task/cancel/", ws.handleCancelTask)

	// 静态文件（使用嵌入的文件系统）
	subFS, _ := fs.Sub(webFiles, "web")
	fileServer := http.FileServer(http.FS(subFS))
	
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// API 路径不处理
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}
		// 检查嵌入文件中是否存在该路径
		filePath := strings.TrimPrefix(r.URL.Path, "/")
		if filePath == "" {
			filePath = "index.html"
		}
		_, err := webFiles.Open("web/" + filePath)
		if err != nil {
			// 文件不存在，返回 index.html (SPA 支持)
			http.ServeFileFS(w, r, webFiles, "web/index.html")
			return
		}
		// 文件存在，提供服务
		fileServer.ServeHTTP(w, r)
	})

	addr := ":" + ws.port
	log.Printf("Web 服务器启动: http://localhost:%s", ws.port)
	log.Fatal(http.ListenAndServe(addr, mux))
}

// handleConfig 获取/更新服务器配置
func (ws *WebServer) handleConfig(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	switch r.Method {
	case "GET":
		ws.mu.RLock()
		defer ws.mu.RUnlock()
		ws.writeJSON(w, ws.config)

	case "POST":
		var req ServerConfig
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			ws.writeError(w, http.StatusBadRequest, "请求格式错误")
			return
		}
		ws.mu.Lock()
		if req.Proxy != "" {
			ws.config.Proxy = req.Proxy
		}
		if req.MoEmailURL != "" {
			ws.config.MoEmailURL = req.MoEmailURL
		}
		ws.config.MoEmailKey = req.MoEmailKey
		ws.config.UseOutlook = req.UseOutlook
		if req.OutlookCSV != "" {
			ws.config.OutlookCSV = req.OutlookCSV
		}
		if req.Delay > 0 {
			ws.config.Delay = req.Delay
		}
		defer ws.mu.Unlock()
		ws.writeJSON(w, ws.config)

	default:
		ws.writeError(w, http.StatusMethodNotAllowed, "不支持的方法")
	}
}

// handleRegister 启动注册任务
func (ws *WebServer) handleRegister(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	if r.Method != "POST" {
		ws.writeError(w, http.StatusMethodNotAllowed, "只支持 POST")
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ws.writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}

	if req.Count <= 0 {
		req.Count = 1
	}
	if req.Concurrency <= 0 {
		req.Concurrency = 1
	}
	if req.Delay < 0 {
		req.Delay = ws.config.Delay
	}

	proxy := req.Proxy
	if proxy == "" {
		proxy = ws.config.Proxy
	}

	taskID := fmt.Sprintf("task_%d", time.Now().UnixNano())
	task := &Task{
		ID:        taskID,
		Status:    "running",
		Count:     req.Count,
		StartTime: time.Now(),
		Logs:      make([]string, 0),
		Results:   make([]map[string]interface{}, 0),
		cancel:    make(chan struct{}),
	}

	ws.mu.Lock()
	ws.tasks[taskID] = task
	ws.mu.Unlock()

	go ws.runTask(task, req, proxy)

	ws.writeJSON(w, map[string]string{"task_id": taskID, "status": "running"})
}

// runTask 执行注册任务
func (ws *WebServer) runTask(task *Task, req RegisterRequest, proxy string) {
	defer func() {
		now := time.Now()
		task.EndTime = &now
		ws.mu.Lock()
		if task.Status == "running" {
			task.Status = "completed"
		}
		ws.mu.Unlock()
	}()

	cfg := core.NewConfig()
	cfg.Proxy = proxy
	cfg.MoEmailBaseURL = req.MoEmailURL
	if cfg.MoEmailBaseURL == "" {
		cfg.MoEmailBaseURL = ws.config.MoEmailURL
	}
	cfg.MoEmailAPIKey = req.MoEmailKey
	cfg.UseOutlook = req.UseOutlook
	cfg.OutlookCSV = ws.config.OutlookCSV

	var outlookAccounts []email.OutlookAccount
	if cfg.UseOutlook {
		var err error
		outlookAccounts, err = email.ParseOutlookCSV(cfg.OutlookCSV)
		if err != nil {
			task.Logs = append(task.Logs, fmt.Sprintf("[ERROR] 读取 Outlook CSV 失败: %v", err))
			task.Status = "failed"
			return
		}
		if len(outlookAccounts) == 0 {
			task.Logs = append(task.Logs, "[ERROR] Outlook CSV 中没有账号")
			task.Status = "failed"
			return
		}
		task.Logs = append(task.Logs, fmt.Sprintf("[INFO] Outlook 模式: 已加载 %d 个账号", len(outlookAccounts)))
	} else {
		task.Logs = append(task.Logs, "[INFO] 临时邮箱模式")
	}

	// 检测 IP
	ws.checkIPRegion(task, proxy)

	outPath := ws.config.OutputPath
	os.MkdirAll(filepath.Dir(outPath), 0755)

	// 加载已有结果
	var existing []map[string]interface{}
	if data, err := os.ReadFile(outPath); err == nil {
		json.Unmarshal(data, &existing)
	}

	var results []map[string]interface{}
	var mu sync.Mutex
	var accountIdx int64

	getNextAccount := func() (email.OutlookAccount, int, bool) {
		idx := int(atomic.AddInt64(&accountIdx, 1) - 1)
		if idx >= len(outlookAccounts) {
			return email.OutlookAccount{}, idx, false
		}
		return outlookAccounts[idx], idx, true
	}

	doTask := func(taskNum int) bool {
		taskCfg := *cfg
		taskCfg.Password = core.GenPassword()

		var acc email.OutlookAccount
		if cfg.UseOutlook {
			var ok bool
			var accIdx int
			acc, accIdx, ok = getNextAccount()
			if !ok {
				mu.Lock()
				task.Logs = append(task.Logs, fmt.Sprintf("[任务%d] Outlook 账号已用完，停止", taskNum+1))
				mu.Unlock()
				return false
			}
			taskCfg.OutlookAccount = &acc
			mu.Lock()
			task.Logs = append(task.Logs, fmt.Sprintf("[%d/%d] 开始注册 (账号 #%d %s)", taskNum+1, task.Count, accIdx+1, acc.Email))
			mu.Unlock()
		} else {
			mu.Lock()
			task.Logs = append(task.Logs, fmt.Sprintf("[%d/%d] 开始注册", taskNum+1, task.Count))
			mu.Unlock()
		}

		reg := core.NewRegistrar(&taskCfg)
		result := reg.Run()

		errStr, _ := result["error"].(string)
		if errStr == "邮箱已注册过，跳过" {
			emailAddr, _ := result["email"].(string)
			if emailAddr == "" && cfg.UseOutlook {
				emailAddr = acc.Email
			}
			mu.Lock()
			task.Logs = append(task.Logs, fmt.Sprintf("[%d/%d] %s 已注册，跳过", taskNum+1, task.Count, emailAddr))
			mu.Unlock()
			return true
		}

		mu.Lock()
		results = append(results, result)
		task.Results = make([]map[string]interface{}, len(results))
		copy(task.Results, results)
		
		okCount := 0
		failCount := 0
		for _, r := range results {
			switch r["status"] {
			case "success":
				okCount++
			case "failed":
				failCount++
			}
		}
		task.Progress = len(results)
		task.Success = okCount
		task.Failed = failCount
		mu.Unlock()

		if result["status"] == "success" {
			mu.Lock()
			task.Logs = append(task.Logs, fmt.Sprintf("[%d/%d] %s 成功 (累计 %d 成功)", len(results), task.Count, result["email"], okCount))
			mu.Unlock()
		} else {
			if len(errStr) > 60 {
				errStr = errStr[:60]
			}
			mu.Lock()
			task.Logs = append(task.Logs, fmt.Sprintf("[%d/%d] %s 失败: %s", len(results), task.Count, result["email"], errStr))
			mu.Unlock()
		}
		return true
	}

	concurrency := req.Concurrency
	if concurrency > 1 {
		task.Logs = append(task.Logs, fmt.Sprintf("[INFO] 并发模式: %d 并发, 共 %d 个", concurrency, task.Count))
		t0 := time.Now()
		sem := make(chan struct{}, concurrency)
		var wg sync.WaitGroup
		for i := 0; i < task.Count; i++ {
			select {
			case <-task.cancel:
				task.Logs = append(task.Logs, "[INFO] 任务已取消")
				task.Status = "cancelled"
				return
			default:
			}
			wg.Add(1)
			sem <- struct{}{}
			go func(idx int) {
				defer wg.Done()
				defer func() { <-sem }()
				doTask(idx)
			}(i)
		}
		wg.Wait()
		elapsed := time.Since(t0).Seconds()
		task.Logs = append(task.Logs, fmt.Sprintf("[INFO] 耗时 %.1fs, 平均 %.1fs/号", elapsed, elapsed/float64(max(len(results), 1))))
	} else {
		for i := 0; i < task.Count; i++ {
			select {
			case <-task.cancel:
				task.Logs = append(task.Logs, "[INFO] 任务已取消")
				task.Status = "cancelled"
				return
			default:
			}
			doTask(i)
			if req.Delay > 0 && i < task.Count-1 {
				time.Sleep(time.Duration(req.Delay) * time.Second)
			}
		}
	}

	// 保存结果
	saveResultsWeb(existing, results, outPath)

	okCount := 0
	failCount := 0
	for _, r := range results {
		switch r["status"] {
		case "success":
			okCount++
		case "failed":
			failCount++
		}
	}
	task.Logs = append(task.Logs, fmt.Sprintf("[INFO] 完成! 成功: %d, 失败: %d, 总计: %d", okCount, failCount, len(results)))
	task.Logs = append(task.Logs, fmt.Sprintf("[INFO] 结果已保存: %s", outPath))
}

// saveResultsWeb 保存结果到 JSON
func saveResultsWeb(existing []map[string]interface{}, results []map[string]interface{}, path string) {
	outputData := make([]map[string]interface{}, len(existing))
	copy(outputData, existing)

	for _, r := range results {
		if r["status"] == "success" {
			at, _ := r["aws_token"].(map[string]interface{})
			if at == nil {
				at = map[string]interface{}{}
			}
			verify, _ := r["verify"].(map[string]interface{})
			item := map[string]interface{}{
				"refreshToken": at["refreshToken"],
				"provider":     "BuilderId",
				"clientId":     r["client_id"],
				"clientSecret": r["client_secret"],
				"region":       "us-east-1",
				"email":        r["email"],
			}
			if verify != nil {
				item["creditUsed"] = verify["credit_used"]
				item["creditLimit"] = verify["credit_limit"]
				item["subscription"] = verify["subscription"]
			}
			outputData = append(outputData, item)
		}
	}
	b, _ := json.MarshalIndent(outputData, "", "  ")
	os.WriteFile(path, b, 0644)
}

// handleTasks 获取任务列表
func (ws *WebServer) handleTasks(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	ws.mu.RLock()
	defer ws.mu.RUnlock()

	type TaskSummary struct {
		ID        string     `json:"id"`
		Status    string     `json:"status"`
		Count     int        `json:"count"`
		Progress  int        `json:"progress"`
		Success   int        `json:"success"`
		Failed    int        `json:"failed"`
		StartTime time.Time  `json:"start_time"`
		EndTime   *time.Time `json:"end_time,omitempty"`
	}

	summaries := make([]TaskSummary, 0, len(ws.tasks))
	for _, task := range ws.tasks {
		summaries = append(summaries, TaskSummary{
			ID:        task.ID,
			Status:    task.Status,
			Count:     task.Count,
			Progress:  task.Progress,
			Success:   task.Success,
			Failed:    task.Failed,
			StartTime: task.StartTime,
			EndTime:   task.EndTime,
		})
	}

	ws.writeJSON(w, summaries)
}

// handleTaskDetail 获取任务详情
func (ws *WebServer) handleTaskDetail(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	taskID := r.URL.Path[len("/api/task/"):]
	if taskID == "" {
		ws.writeError(w, http.StatusBadRequest, "缺少任务ID")
		return
	}

	ws.mu.RLock()
	task, ok := ws.tasks[taskID]
	ws.mu.RUnlock()

	if !ok {
		ws.writeError(w, http.StatusNotFound, "任务不存在")
		return
	}

	ws.writeJSON(w, task)
}

// handleCancelTask 取消任务
func (ws *WebServer) handleCancelTask(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	if r.Method != "POST" {
		ws.writeError(w, http.StatusMethodNotAllowed, "只支持 POST")
		return
	}

	taskID := r.URL.Path[len("/api/task/cancel/"):]
	if taskID == "" {
		ws.writeError(w, http.StatusBadRequest, "缺少任务ID")
		return
	}

	ws.mu.RLock()
	task, ok := ws.tasks[taskID]
	ws.mu.RUnlock()

	if !ok {
		ws.writeError(w, http.StatusNotFound, "任务不存在")
		return
	}

	if task.Status != "running" {
		ws.writeError(w, http.StatusBadRequest, "任务已结束")
		return
	}

	close(task.cancel)
	ws.writeJSON(w, map[string]string{"status": "cancelled"})
}

// handleResults 获取注册结果
func (ws *WebServer) handleResults(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	outPath := ws.config.OutputPath
	data, err := os.ReadFile(outPath)
	if err != nil {
		ws.writeJSON(w, []interface{}{})
		return
	}

	var results []map[string]interface{}
	if err := json.Unmarshal(data, &results); err != nil {
		ws.writeError(w, http.StatusInternalServerError, "结果文件格式错误")
		return
	}

	ws.writeJSON(w, results)
}

// handleOutlookCSV 获取/上传 Outlook CSV
func (ws *WebServer) handleOutlookCSV(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	csvPath := ws.config.OutlookCSV

	switch r.Method {
	case "GET":
		data, err := os.ReadFile(csvPath)
		if err != nil {
			ws.writeJSON(w, map[string]interface{}{
				"exists":  false,
				"content": "",
				"count":   0,
			})
			return
		}
		lines := 0
		for _, line := range splitLines(string(data)) {
			if line != "" {
				lines++
			}
		}
		ws.writeJSON(w, map[string]interface{}{
			"exists":  true,
			"content": string(data),
			"count":   lines,
		})

	case "POST":
		var req struct {
			Content string `json:"content"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			ws.writeError(w, http.StatusBadRequest, "请求格式错误")
			return
		}
		if err := os.WriteFile(csvPath, []byte(req.Content), 0644); err != nil {
			ws.writeError(w, http.StatusInternalServerError, "保存失败: "+err.Error())
			return
		}
		lines := 0
		for _, line := range splitLines(req.Content) {
			if line != "" {
				lines++
			}
		}
		ws.writeJSON(w, map[string]interface{}{
			"status": "ok",
			"count":  lines,
		})

	default:
		ws.writeError(w, http.StatusMethodNotAllowed, "不支持的方法")
	}
}

// handleStats 获取结果统计
func (ws *WebServer) handleStats(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	outPath := ws.config.OutputPath
	data, err := os.ReadFile(outPath)
	if err != nil || len(data) == 0 {
		ws.writeJSON(w, map[string]interface{}{
			"total":     0,
			"emails":    0,
			"tokens":    0,
			"file_size": 0,
		})
		return
	}

	var results []map[string]interface{}
	json.Unmarshal(data, &results)

	emails := 0
	tokens := 0
	for _, r := range results {
		if r["email"] != nil && r["email"] != "" {
			emails++
		}
		if r["refreshToken"] != nil && r["refreshToken"] != "" {
			tokens++
		}
	}

	ws.writeJSON(w, map[string]interface{}{
		"total":     len(results),
		"emails":    emails,
		"tokens":    tokens,
		"file_size": len(data),
	})
}

// handleClearResults 清空结果
func (ws *WebServer) handleClearResults(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != "POST" {
		ws.writeError(w, http.StatusMethodNotAllowed, "只支持 POST")
		return
	}

	outPath := ws.config.OutputPath
	os.WriteFile(outPath, []byte("[]"), 0644)
	ws.writeJSON(w, map[string]string{"status": "ok"})
}

func (ws *WebServer) handleIPCheck(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	proxy := r.URL.Query().Get("proxy")
	if proxy == "" {
		proxy = ws.config.Proxy
	}

	task := &Task{Logs: make([]string, 0)}
	ws.checkIPRegion(task, proxy)

	ws.writeJSON(w, map[string]interface{}{
		"logs": task.Logs,
	})
}

// checkIPRegion 检测 IP 归属地
func (ws *WebServer) checkIPRegion(task *Task, proxy string) {
	task.Logs = append(task.Logs, "[INFO] 正在检测当前 IP 地区...")

	checkWithProxy := func(p string) (map[string]interface{}, bool) {
		client := httputil2.NewNoRedirectTLSClient(p, "120")
		req, err := fhttp.NewRequest("GET", "https://api.ip.sb/geoip", nil)
		if err != nil {
			return nil, false
		}
		resp, err := client.Do(req)
		if err != nil {
			return nil, false
		}
		defer resp.Body.Close()
		if resp.StatusCode != 200 {
			return nil, false
		}
		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return nil, false
		}
		return result, true
	}

	// 先尝试通过代理检测
	if proxy != "" {
		if result, ok := checkWithProxy(proxy); ok {
			if ip, _ := result["ip"].(string); ip != "" {
				country, _ := result["country"].(string)
				region, _ := result["region"].(string)
				city, _ := result["city"].(string)
				isp, _ := result["isp"].(string)
				if isp == "" {
					isp, _ = result["organization"].(string)
				}
				task.Logs = append(task.Logs, fmt.Sprintf("[INFO] 代理 IP: %s [%s %s %s] ISP: %s", ip, country, region, city, isp))
				return
			}
		}
		task.Logs = append(task.Logs, "[WARN] 代理不可用，尝试直连检测...")
	}

	// fallback: 直连检测
	if result, ok := checkWithProxy(""); ok {
		if ip, _ := result["ip"].(string); ip != "" {
			country, _ := result["country"].(string)
			region, _ := result["region"].(string)
			city, _ := result["city"].(string)
			isp, _ := result["isp"].(string)
			if isp == "" {
				isp, _ = result["organization"].(string)
			}
			task.Logs = append(task.Logs, fmt.Sprintf("[INFO] 当前 IP: %s [%s %s %s] ISP: %s", ip, country, region, city, isp))
		}
	} else {
		task.Logs = append(task.Logs, "[WARN] IP 检测失败")
	}
}

// writeJSON 写入 JSON 响应
func (ws *WebServer) writeJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// writeError 写入错误响应
func (ws *WebServer) writeError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

// setCORS 设置 CORS 头
func setCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

// splitLines 分割行
func splitLines(s string) []string {
	var lines []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			lines = append(lines, s[start:i])
			start = i + 1
		}
	}
	if start < len(s) {
		lines = append(lines, s[start:])
	}
	return lines
}
