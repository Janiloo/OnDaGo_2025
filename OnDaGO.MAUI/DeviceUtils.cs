#if ANDROID
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Android.Provider;

namespace OnDaGO.MAUI
{
    internal class DeviceUtils
    {
        public static bool AreDeveloperOptionsEnabled()
        {
            var adbEnabled = Settings.Global.GetInt(Android.App.Application.Context.ContentResolver, Settings.Global.DevelopmentSettingsEnabled, 0);
            return adbEnabled == 1;
        }
    }
}
#endif