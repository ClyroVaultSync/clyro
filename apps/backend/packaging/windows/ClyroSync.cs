// Clyro Local Sync Server's tray app. It keeps clyro-sync-server.exe (the Fastify server packed into
// one exe) running in the background, restarts it if it dies, and shows a tray icon with a small menu.
//
// Built by scripts/build-windows.mjs with the C# compiler that ships with Windows (.NET Framework 4),
// which only understands C# 5 - so no $"" strings, ?. operators or expression-bodied members here.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

static class Program
{
    [STAThread]
    static void Main()
    {
        bool isFirstInstance;
        using (new Mutex(true, "Local\\ClyroLocalSyncServer", out isFirstInstance))
        {
            if (!isFirstInstance) return;

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new TrayApp());
        }
    }
}

class TrayApp : ApplicationContext
{
    const int Port = 47821;
    const string ServerProcessName = "clyro-sync-server";
    const string RunKeyPath = @"Software\Microsoft\Windows\CurrentVersion\Run";
    const string RunValueName = "Clyro Local Sync Server";
    const int MaxFailures = 3;
    static readonly TimeSpan FailureWindow = TimeSpan.FromMinutes(1);

    readonly string serverPath = Path.Combine(Path.GetDirectoryName(Application.ExecutablePath), ServerProcessName + ".exe");
    readonly string dataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Clyro");
    readonly string logPath;

    // Process events are marshalled onto the UI thread through this hidden control.
    readonly Control uiThread = new Control();
    readonly NotifyIcon trayIcon = new NotifyIcon();
    readonly ToolStripMenuItem statusItem = new ToolStripMenuItem();
    readonly ToolStripMenuItem tryAgainItem = new ToolStripMenuItem("Try again");
    readonly ToolStripMenuItem startWithWindowsItem = new ToolStripMenuItem("Start with Windows");
    readonly System.Windows.Forms.Timer restartTimer = new System.Windows.Forms.Timer();
    readonly List<DateTime> recentFailures = new List<DateTime>();

    StreamWriter log;
    Process server;
    bool quitting;

    public TrayApp()
    {
        IntPtr forceHandleCreation = uiThread.Handle;

        string logDir = Path.Combine(dataDir, "logs");
        Directory.CreateDirectory(logDir);
        logPath = Path.Combine(logDir, "server.log");
        OpenLog(Path.Combine(logDir, "server.previous.log"));

        BuildTrayIcon();

        restartTimer.Interval = 2000;
        restartTimer.Tick += delegate { restartTimer.Stop(); StartServer(); };

        StopLeftoverServers();
        StartServer();
    }

    void BuildTrayIcon()
    {
        statusItem.Enabled = false;
        tryAgainItem.Visible = false;
        tryAgainItem.Click += delegate { recentFailures.Clear(); tryAgainItem.Visible = false; StartServer(); };
        startWithWindowsItem.Checked = IsStartWithWindowsOn();
        startWithWindowsItem.Click += delegate { SetStartWithWindows(!startWithWindowsItem.Checked); };

        ContextMenuStrip menu = new ContextMenuStrip();
        menu.Items.Add(statusItem);
        menu.Items.Add(tryAgainItem);
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Open data folder", null, delegate { Process.Start("explorer.exe", "\"" + dataDir + "\""); });
        menu.Items.Add("Open log", null, delegate { Process.Start(logPath); });
        menu.Items.Add(startWithWindowsItem);
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Quit", null, delegate { Quit(); });

        using (Stream iconStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("clyro.ico"))
        {
            trayIcon.Icon = new Icon(iconStream, SystemInformation.SmallIconSize);
        }
        trayIcon.ContextMenuStrip = menu;
        trayIcon.Visible = true;
        SetStatus("Starting...");
    }

    void StartServer()
    {
        SetStatus("Starting...");
        WriteLog("Starting " + serverPath);

        ProcessStartInfo info = new ProcessStartInfo(serverPath);
        info.UseShellExecute = false;
        info.CreateNoWindow = true;
        info.RedirectStandardOutput = true;
        info.RedirectStandardError = true;
        info.WorkingDirectory = dataDir;
        info.EnvironmentVariables["PORT"] = Port.ToString();
        info.EnvironmentVariables["DB_PATH"] = Path.Combine(dataDir, "clyro.db");

        Process process = new Process();
        process.StartInfo = info;
        process.EnableRaisingEvents = true;
        process.SynchronizingObject = uiThread;
        process.OutputDataReceived += OnServerOutput;
        process.ErrorDataReceived += OnServerOutput;
        process.Exited += OnServerExited;

        try
        {
            process.Start();
        }
        catch (Exception error)
        {
            WriteLog("Could not start the server: " + error.Message);
            process.Dispose();
            ShowFailure("clyro-sync-server.exe could not be started. Reinstalling Clyro Local Sync Server should fix this.");
            return;
        }

        server = process;
        server.BeginOutputReadLine();
        server.BeginErrorReadLine();
    }

    void OnServerOutput(object sender, DataReceivedEventArgs e)
    {
        if (e.Data == null) return;
        log.WriteLine(e.Data);
        // apps/backend/src/server.ts prints this once it is accepting connections.
        if (e.Data.StartsWith("Server listening at")) SetStatus("Running on port " + Port);
    }

    void OnServerExited(object sender, EventArgs e)
    {
        Process exited = (Process)sender;
        WriteLog("Server exited with code " + exited.ExitCode);
        exited.Dispose();
        if (exited == server) server = null;
        if (quitting) return;

        DateTime now = DateTime.Now;
        recentFailures.Add(now);
        recentFailures.RemoveAll(delegate (DateTime failure) { return now - failure > FailureWindow; });

        if (recentFailures.Count >= MaxFailures)
        {
            ShowFailure("Another program may be using port " + Port + ". Right-click the Clyro icon to open the log or try again.");
            return;
        }

        SetStatus("Restarting...");
        restartTimer.Start();
    }

    void ShowFailure(string detail)
    {
        SetStatus("Stopped - couldn't start");
        tryAgainItem.Visible = true;
        trayIcon.ShowBalloonTip(10000, "Clyro Local Sync Server couldn't start", detail, ToolTipIcon.Error);
    }

    void SetStatus(string status)
    {
        statusItem.Text = status;
        trayIcon.Text = "Clyro Local Sync Server - " + status;
    }

    // Kills a server left running by an earlier copy of this app that was itself killed, which would
    // otherwise keep holding the port.
    void StopLeftoverServers()
    {
        foreach (Process process in Process.GetProcessesByName(ServerProcessName))
        {
            try
            {
                if (string.Equals(process.MainModule.FileName, serverPath, StringComparison.OrdinalIgnoreCase))
                {
                    WriteLog("Stopping a leftover server (pid " + process.Id + ")");
                    process.Kill();
                    process.WaitForExit(5000);
                }
            }
            catch (Exception)
            {
                // Another user's process, or one that exited meanwhile - not ours to stop.
            }
            finally
            {
                process.Dispose();
            }
        }
    }

    bool IsStartWithWindowsOn()
    {
        using (RegistryKey key = Registry.CurrentUser.OpenSubKey(RunKeyPath))
        {
            return key != null && key.GetValue(RunValueName) != null;
        }
    }

    // Uses the same value the installer writes, so uninstalling removes it either way.
    void SetStartWithWindows(bool on)
    {
        using (RegistryKey key = Registry.CurrentUser.CreateSubKey(RunKeyPath))
        {
            if (on) key.SetValue(RunValueName, "\"" + Application.ExecutablePath + "\"");
            else key.DeleteValue(RunValueName, false);
        }
        startWithWindowsItem.Checked = IsStartWithWindowsOn();
    }

    void Quit()
    {
        quitting = true;
        restartTimer.Stop();
        if (server != null)
        {
            WriteLog("Quit from the tray menu; stopping the server");
            try
            {
                server.Kill();
                server.WaitForExit(5000);
            }
            catch (Exception)
            {
                // Already exited.
            }
        }
        // The log stays open: the server's Exited event can still arrive after this, and AutoFlush
        // means nothing is lost when the process ends.
        trayIcon.Visible = false;
        ExitThread();
    }

    // Starts a fresh server.log for this run and keeps the previous run's as server.previous.log.
    void OpenLog(string previousLogPath)
    {
        try
        {
            if (File.Exists(logPath))
            {
                File.Delete(previousLogPath);
                File.Move(logPath, previousLogPath);
            }
        }
        catch (IOException)
        {
            // The old log is open elsewhere; appending to it is fine.
        }
        log = new StreamWriter(logPath, true);
        log.AutoFlush = true;
    }

    void WriteLog(string message)
    {
        log.WriteLine("[" + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "] [tray] " + message);
    }
}
