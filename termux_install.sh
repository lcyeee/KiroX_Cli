#!/data/data/com.termux/files/usr/bin/bash
# KiroX - Termux 一键安装脚本
# 运行方式: curl -fsSL http://156.238.254.27:15244/d/1/KiroX_Termux_arm64.zip | 解压后运行此脚本

echo "=== KiroX Termux 一键安装 ==="
echo ""

PREFIX="${PREFIX:-/data/data/com.termux/files/usr}"
INSTALL_DIR="$PREFIX/bin"
TMP_DIR="$PREFIX/tmp/kirox_install"
DATA_DIR="$PREFIX/var/kirox"
PID_FILE="$DATA_DIR/kirox.pid"

# 创建临时目录
mkdir -p "$TMP_DIR"
cd "$TMP_DIR"

echo "[1/4] 正在下载 KiroX..."
curl -fsSL "http://156.238.254.27:15244/d/1/KiroX_Termux_arm64.zip" -o kirox.zip

if [ ! -f "kirox.zip" ]; then
    echo "下载失败，请检查网络连接"
    exit 1
fi

echo "[2/4] 正在解压..."
unzip -o kirox.zip > /dev/null 2>&1

if [ ! -f "./KiroX" ]; then
    echo "解压失败，文件损坏"
    exit 1
fi

echo "[3/4] 正在安装到 $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$DATA_DIR"

# 复制主程序
cp -f ./KiroX "$INSTALL_DIR/KiroX"
chmod +x "$INSTALL_DIR/KiroX"

echo "[4/4] 正在创建快捷命令..."

# 创建 kiro 命令
cat > "$INSTALL_DIR/kiro" << 'KIRO_SCRIPT'
#!/data/data/com.termux/files/usr/bin/bash
# KiroX 快捷命令

PREFIX="${PREFIX:-/data/data/com.termux/files/usr}"
INSTALL_DIR="$PREFIX/bin"
DATA_DIR="$PREFIX/var/kirox"
PID_FILE="$DATA_DIR/kirox.pid"
LOG_FILE="$DATA_DIR/kirox.log"

# 确保数据目录存在
mkdir -p "$DATA_DIR"

# 获取运行状态
get_status() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo "running"
            return 0
        else
            rm -f "$PID_FILE"
            echo "stopped"
            return 1
        fi
    fi
    echo "stopped"
    return 1
}

# 启动服务
cmd_start() {
    local port="${1:-2011}"
    local status=$(get_status)
    
    if [ "$status" = "running" ]; then
        local pid=$(cat "$PID_FILE")
        echo "KiroX 已在运行中 (PID: $pid)"
        echo "Web 界面: http://localhost:$port"
        return 0
    fi
    
    echo "正在启动 KiroX (端口: $port)..."
    nohup "$INSTALL_DIR/KiroX" -web "$port" > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo "$pid" > "$PID_FILE"
    
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
        echo "KiroX 启动成功 (PID: $pid)"
        echo "Web 界面: http://localhost:$port"
        echo "查看日志: kiro log"
        echo "停止服务: kiro stop"
    else
        echo "启动失败，请查看日志: kiro log"
        rm -f "$PID_FILE"
        return 1
    fi
}

# 停止服务
cmd_stop() {
    local status=$(get_status)
    
    if [ "$status" = "stopped" ]; then
        echo "KiroX 未在运行"
        return 0
    fi
    
    local pid=$(cat "$PID_FILE")
    echo "正在停止 KiroX (PID: $pid)..."
    kill "$pid" 2>/dev/null
    
    # 等待进程结束
    local count=0
    while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
        sleep 0.5
        count=$((count + 1))
    done
    
    if kill -0 "$pid" 2>/dev/null; then
        echo "强制停止..."
        kill -9 "$pid" 2>/dev/null
    fi
    
    rm -f "$PID_FILE"
    echo "KiroX 已停止"
}

# 重启服务
cmd_restart() {
    local port="${1:-2011}"
    cmd_stop
    sleep 1
    cmd_start "$port"
}

# 查看状态
cmd_status() {
    local status=$(get_status)
    if [ "$status" = "running" ]; then
        local pid=$(cat "$PID_FILE")
        echo "KiroX 状态: 运行中"
        echo "PID: $pid"
        echo "端口: $(grep -o 'port: [0-9]*' "$LOG_FILE" 2>/dev/null | tail -1 | cut -d' ' -f2 || echo 2011)"
        echo "Web 界面: http://localhost:$(grep -o 'port: [0-9]*' "$LOG_FILE" 2>/dev/null | tail -1 | cut -d' ' -f2 || echo 2011)"
    else
        echo "KiroX 状态: 已停止"
    fi
}

# 查看日志
cmd_log() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo "暂无日志"
    fi
}

# 显示帮助
cmd_help() {
    echo "KiroX - AWS/Kiro 账号批量注册平台"
    echo ""
    echo "用法:"
    echo "  kiro                  # 启动 Web 服务 (默认端口 2011)"
    echo "  kiro start [port]     # 启动 Web 服务 (可指定端口)"
    echo "  kiro stop             # 停止服务"
    echo "  kiro restart [port]   # 重启服务"
    echo "  kiro status           # 查看运行状态"
    echo "  kiro log              # 查看运行日志"
    echo "  kiro help             # 显示此帮助信息"
    echo ""
    echo "Web 界面: 打开浏览器访问 http://localhost:2011"
    echo "GitHub: https://github.com/lcyeee/KiroX_Cli"
}

# 主命令分发
case "${1:-}" in
    start)
        cmd_start "${2:-2011}"
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart "${2:-2011}"
        ;;
    status)
        cmd_status
        ;;
    log)
        cmd_log
        ;;
    help|-h|--help)
        cmd_help
        ;;
    *)
        # 默认启动
        cmd_start "2011"
        ;;
esac
KIRO_SCRIPT

chmod +x "$INSTALL_DIR/kiro"

# 清理临时文件
rm -rf "$TMP_DIR"

echo ""
echo "=== 安装完成 ==="
echo ""
echo "使用方法:"
echo "  kiro                  # 启动 Web 服务 (端口 2011)"
echo "  kiro start [port]     # 启动 Web 服务 (可指定端口)"
echo "  kiro stop             # 停止服务"
echo "  kiro restart          # 重启服务"
echo "  kiro status           # 查看运行状态"
echo "  kiro log              # 查看运行日志"
echo "  kiro help             # 显示帮助"
echo ""
echo "Web 界面: 打开浏览器访问 http://localhost:2011"
echo ""
