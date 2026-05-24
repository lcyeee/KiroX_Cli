import streamlit as st
import time
import os
import re
import json

from config import (
    DEFAULT_OUTPUT_PATH,
    DEFAULT_MOEMAIL_URL,
    DEFAULT_OUTLOOK_CSV,
    MOEMAIL_URL,
    MOEMAIL_KEY,
    PROXY_PATTERN,
)
from process_manager import KiroXProcess
from csv_handler import (
    load_outlook_csv,
    parse_outlook_lines,
    save_outlook_csv,
    to_dataframe,
)
from json_handler import load_results, results_to_display

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
GO_BIN = os.path.join(SCRIPT_DIR, "..", "kirox-cli")
if not os.path.exists(GO_BIN):
    GO_BIN = os.path.join(SCRIPT_DIR, "kirox-cli")

OUTLOOK_CSV_PATH = os.path.join(SCRIPT_DIR, DEFAULT_OUTLOOK_CSV)
OUTPUT_JSON_PATH = os.path.join(SCRIPT_DIR, DEFAULT_OUTPUT_PATH)

st.set_page_config(page_title="KiroX Web", page_icon="🚀", layout="wide")


def validate_proxy(proxy: str) -> bool:
    if not proxy:
        return True
    return bool(re.match(PROXY_PATTERN, proxy))


def build_command(params: dict) -> list:
    cmd = [GO_BIN]

    if params.get("use_outlook"):
        cmd.append("-outlook")
        csv_path = params.get("outlook_csv", OUTLOOK_CSV_PATH)
        cmd.extend(["-outlook-csv", csv_path])
    else:
        cmd.extend(["-moemail-url", params.get("moemail_url", MOEMAIL_URL)])
        cmd.extend(["-moemail-key", params.get("moemail_key", MOEMAIL_KEY)])

    cmd.extend(["-n", str(params["count"])])
    cmd.extend(["-j", str(params["concurrency"])])
    cmd.extend(["-d", str(params["delay"])])

    output = params.get("output", OUTPUT_JSON_PATH)
    cmd.extend(["-o", output])

    if params.get("proxy"):
        cmd.extend(["-p", params["proxy"]])

    if params.get("debug"):
        cmd.append("-debug")

    return cmd


def init_session_state():
    if "kirox" not in st.session_state:
        st.session_state.kirox = KiroXProcess()
    if "outlook_accounts" not in st.session_state:
        st.session_state.outlook_accounts = []
    if "outlook_loaded" not in st.session_state:
        st.session_state.outlook_loaded = False
    if "last_run_params" not in st.session_state:
        st.session_state.last_run_params = None


init_session_state()

st.title("KiroX CLI - AWS Builder ID 批量注册")
st.caption("Web 控制台 | 端口 2011")

with st.sidebar:
    st.header("全局设置")

    email_mode = st.selectbox(
        "邮箱模式",
        ["MoeMail 临时邮箱", "Outlook 邮箱池"],
        index=0,
    )

    proxy = st.text_input(
        "代理地址",
        placeholder="http://user:pass@ip:port (选填)",
    )
    if proxy and not validate_proxy(proxy):
        st.error("代理地址格式不正确，需以 http://、https:// 或 socks5:// 开头")

    concurrency = st.slider("并发数", min_value=1, max_value=10, value=3)

    st.divider()
    st.markdown("**环境变量**")
    st.code(f"MOEMAIL_URL: {MOEMAIL_URL or '(未设置)'}", language=None)

    st.divider()
    if st.session_state.kirox.is_running():
        st.info(f"状态: 运行中 (PID: {st.session_state.kirox.pid})")
        if st.button("停止任务", type="secondary", use_container_width=True):
            st.session_state.kirox.stop()
            st.rerun()
    else:
        status = st.session_state.kirox.get_status()
        if status == "completed":
            st.success("状态: 已完成")
        elif status == "stopped":
            st.warning("状态: 已停止")
        else:
            st.info("状态: 空闲")

if email_mode == "MoeMail 临时邮箱":
    use_outlook = False
else:
    use_outlook = True

st.header("注册参数")
col1, col2, col3, col4 = st.columns(4)
with col1:
    count = st.number_input("注册数量", min_value=1, max_value=1000, value=1)
with col2:
    delay = st.number_input("任务间隔(秒)", min_value=0, max_value=300, value=3)
with col3:
    debug_mode = st.checkbox("调试模式")
with col4:
    output_path = st.text_input("输出路径", value=DEFAULT_OUTPUT_PATH)

if use_outlook:
    st.header("Outlook 邮箱池管理")

    tab1, tab2 = st.tabs(["上传/粘贴 CSV", "已加载账号预览"])

    with tab1:
        uploaded_file = st.file_uploader("上传 outlook.csv", type=["csv", "txt"])
        outlook_text = st.text_area(
            "或直接粘贴账号数据 (每行: 邮箱----密码----客户端ID----RefreshToken)",
            height=150,
            placeholder="example@outlook.com----password123----xxxx-xxxx----token...",
        )

        col_a, col_b = st.columns(2)
        with col_a:
            if st.button("加载邮箱数据", use_container_width=True):
                accounts = []
                if uploaded_file:
                    content = uploaded_file.getvalue().decode("utf-8")
                    accounts = parse_outlook_lines(content)
                elif outlook_text.strip():
                    accounts = parse_outlook_lines(outlook_text)
                elif os.path.exists(OUTLOOK_CSV_PATH):
                    accounts = load_outlook_csv(OUTLOOK_CSV_PATH)

                if accounts:
                    st.session_state.outlook_accounts = accounts
                    st.session_state.outlook_loaded = True
                    st.success(f"成功加载 {len(accounts)} 个 Outlook 邮箱账号")
                else:
                    st.warning("未找到有效的邮箱数据，请上传文件或粘贴数据")

        with col_b:
            if st.session_state.outlook_loaded and st.session_state.outlook_accounts:
                if st.button("清除已加载数据", use_container_width=True):
                    st.session_state.outlook_accounts = []
                    st.session_state.outlook_loaded = False
                    st.rerun()

    with tab2:
        if st.session_state.outlook_loaded and st.session_state.outlook_accounts:
            df = to_dataframe(st.session_state.outlook_accounts)
            st.dataframe(df, use_container_width=True, height=300)
            st.info(f"共 {len(st.session_state.outlook_accounts)} 个可用账号")
        else:
            st.info("请先加载 Outlook 邮箱数据")

    if count > len(st.session_state.outlook_accounts) and st.session_state.outlook_loaded:
        st.warning(
            f"注册数量 ({count}) 大于可用账号数 ({len(st.session_state.outlook_accounts)}), "
            f"超出部分将被跳过"
        )
else:
    st.header("MoeMail 配置")
    col_m1, col_m2 = st.columns(2)
    with col_m1:
        moemail_url = st.text_input("API 地址", value=MOEMAIL_URL)
    with col_m2:
        moemail_key = st.text_input("API Key", value=MOEMAIL_KEY, type="password")

    if not moemail_key:
        st.warning("请输入 MoeMail API Key")

st.header("控制面板")

params = {
    "count": count,
    "delay": delay,
    "concurrency": concurrency,
    "debug": debug_mode,
    "output": output_path,
    "proxy": proxy if proxy else "",
    "use_outlook": use_outlook,
}

if use_outlook:
    if st.session_state.outlook_loaded and st.session_state.outlook_accounts:
        csv_path = os.path.join(SCRIPT_DIR, "temp_outlook.csv")
        save_outlook_csv(csv_path, st.session_state.outlook_accounts)
        params["outlook_csv"] = csv_path
    elif os.path.exists(OUTLOOK_CSV_PATH):
        params["outlook_csv"] = OUTLOOK_CSV_PATH
    else:
        st.error("未配置 Outlook 邮箱池，请先上传或粘贴数据")
else:
    params["moemail_url"] = moemail_url
    params["moemail_key"] = moemail_key

cmd = build_command(params)

col_start, col_stop, col_clear = st.columns([2, 1, 1])

with col_start:
    start_btn = st.button(
        "开始注册",
        type="primary",
        use_container_width=True,
        disabled=st.session_state.kirox.is_running(),
    )

with col_stop:
    stop_btn = st.button(
        "停止",
        type="secondary",
        use_container_width=True,
        disabled=not st.session_state.kirox.is_running(),
    )

if start_btn:
    if use_outlook and not params.get("outlook_csv"):
        st.error("请先加载 Outlook 邮箱数据")
    elif not use_outlook and not params.get("moemail_key"):
        st.error("请输入 MoeMail API Key")
    else:
        st.session_state.kirox.start(cmd, cwd=SCRIPT_DIR)
        st.session_state.last_run_params = params
        st.rerun()

if stop_btn:
    st.session_state.kirox.stop()
    st.rerun()

st.header("实时日志")
log_container = st.container()

if st.session_state.kirox.is_running() or st.session_state.kirox.full_log:
    logs = st.session_state.kirox.get_full_log()

    with log_container:
        st.code(logs, language=None)

        status_text = f"状态: {st.session_state.kirox.get_status()} | 耗时: {st.session_state.kirox.get_elapsed()}"
        if st.session_state.kirox.is_running():
            st.info(status_text)
        else:
            st.success(status_text)

    if st.session_state.kirox.is_running():
        time.sleep(1)
        st.rerun()

st.header("注册结果")
results = load_results(output_path)

if results:
    st.subheader(f"已注册账号: {len(results)} 个")
    display_data = results_to_display(results)
    st.dataframe(
        display_data,
        use_container_width=True,
        height=300,
    )

    col_dl1, col_dl2 = st.columns(2)
    with col_dl1:
        json_str = json.dumps(results, indent=2, ensure_ascii=False)
        st.download_button(
            label="下载结果 JSON",
            data=json_str,
            file_name="results.json",
            mime="application/json",
            use_container_width=True,
        )
    with col_dl2:
        with st.expander("查看完整 JSON"):
            st.json(results)
else:
    st.info("暂无注册结果")

with st.sidebar:
    st.divider()
    st.markdown("### 命令行预览")
    st.code(" ".join(cmd), language="bash")
