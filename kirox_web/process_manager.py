import subprocess
import threading
import queue
import time
import psutil
import os


class KiroXProcess:
    def __init__(self):
        self.process = None
        self.pid = None
        self.log_queue = queue.Queue()
        self.running = False
        self._stop_event = threading.Event()
        self._read_thread = None
        self.full_log = []
        self.start_time = None
        self.end_time = None
        self.exit_code = None

    def start(self, cmd: list, cwd: str = None):
        self.stop()
        self._stop_event.clear()
        self.running = True
        self.full_log = []
        self.start_time = time.time()
        self.end_time = None
        self.exit_code = None

        env = os.environ.copy()

        self.process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            cwd=cwd,
            env=env,
        )
        self.pid = self.process.pid
        self._read_thread = threading.Thread(target=self._read_logs, daemon=True)
        self._read_thread.start()

    def _read_logs(self):
        if self.process is None or self.process.stdout is None:
            return
        try:
            for line in iter(self.process.stdout.readline, ""):
                if self._stop_event.is_set():
                    break
                self.log_queue.put(line)
                self.full_log.append(line)
        except Exception:
            pass
        finally:
            if self.process is not None:
                try:
                    self.exit_code = self.process.wait(timeout=5)
                except Exception:
                    pass
                self.running = False
                self.end_time = time.time()

    def stop(self):
        self._stop_event.set()
        self.running = False
        if self.process and self.process.poll() is None:
            try:
                parent = psutil.Process(self.process.pid)
                children = parent.children(recursive=True)
                for child in children:
                    try:
                        child.terminate()
                    except Exception:
                        child.kill()
                parent.terminate()
                try:
                    parent.wait(timeout=5)
                except Exception:
                    parent.kill()
            except Exception:
                pass

    def get_logs(self, clear: bool = True) -> list:
        logs = []
        while not self.log_queue.empty():
            logs.append(self.log_queue.get_nowait())
        if clear:
            self.log_queue.queue.clear()
        return logs

    def get_full_log(self) -> str:
        return "".join(self.full_log)

    def is_running(self) -> bool:
        if self.process is None:
            return False
        if self.process.poll() is not None:
            self.running = False
            return False
        return self.running

    def get_elapsed(self) -> str:
        if self.start_time is None:
            return "0s"
        end = self.end_time or time.time()
        elapsed = end - self.start_time
        if elapsed < 60:
            return f"{elapsed:.1f}s"
        minutes = int(elapsed // 60)
        seconds = elapsed % 60
        return f"{minutes}m {seconds:.0f}s"

    def get_status(self) -> str:
        if self.is_running():
            return "running"
        if self.exit_code == 0:
            return "completed"
        if self.exit_code is not None:
            return f"exited (code={self.exit_code})"
        return "stopped"
