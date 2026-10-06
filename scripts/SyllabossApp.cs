using System;
using System.IO;
using System.Diagnostics;
using System.Windows.Forms;
using System.Drawing;

namespace Syllaboss
{
    static class Program
    {
        private const string AppUrl = "https://study-spark-hub.vercel.app";
        private const string AppName = "Syllaboss";

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            try
            {
                // Create Desktop Shortcut
                CreateShortcuts();

                // Launch in standalone web app window using Edge or Chrome
                LaunchStandaloneApp();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Error launching Syllaboss: " + ex.Message,
                    AppName,
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        static void CreateShortcuts()
        {
            try
            {
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string startMenuPath = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                string currentExe = Application.ExecutablePath;

                CreateShortcutFile(Path.Combine(desktopPath, AppName + ".url"), AppUrl);
                CreateShortcutFile(Path.Combine(startMenuPath, AppName + ".url"), AppUrl);
            }
            catch
            {
                // Silently continue if permissions restrict shortcut writing
            }
        }

        static void CreateShortcutFile(string path, string targetUrl)
        {
            using (StreamWriter writer = new StreamWriter(path))
            {
                writer.WriteLine("[InternetShortcut]");
                writer.WriteLine("URL=" + targetUrl);
                writer.WriteLine("IconIndex=0");
                writer.WriteLine("IconFile=" + Application.ExecutablePath);
            }
        }

        static void LaunchStandaloneApp()
        {
            // Try Edge standalone app mode first (default on Windows 10 & 11)
            string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (!File.Exists(edgePath))
            {
                edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            }

            if (File.Exists(edgePath))
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = edgePath,
                    Arguments = "--app=\"" + AppUrl + "\" --window-size=1280,820",
                    UseShellExecute = true
                };
                Process.Start(psi);
                return;
            }

            // Try Chrome standalone app mode
            string chromePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            if (!File.Exists(chromePath))
            {
                chromePath = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";
            }

            if (File.Exists(chromePath))
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = chromePath,
                    Arguments = "--app=\"" + AppUrl + "\" --window-size=1280,820",
                    UseShellExecute = true
                };
                Process.Start(psi);
                return;
            }

            // Fallback: Open in default browser
            Process.Start(new ProcessStartInfo
            {
                FileName = AppUrl,
                UseShellExecute = true
            });
        }
    }
}
