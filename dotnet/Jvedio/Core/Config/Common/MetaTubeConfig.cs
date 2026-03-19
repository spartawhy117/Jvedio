using Jvedio.Core.Config.Base;

namespace Jvedio.Core.Config
{
    public class MetaTubeConfig : AbstractConfig
    {
        private MetaTubeConfig() : base("MetaTubeConfig")
        {
            Enabled = true;
            ServerUrl = string.Empty;
            ManualRefreshOnly = true;
            JsonCacheEnabled = true;
            ActorAvatarCacheEnabled = true;
            RequestTimeoutSeconds = 60;
        }

        private static MetaTubeConfig _instance = null;

        public static MetaTubeConfig CreateInstance()
        {
            if (_instance == null)
                _instance = new MetaTubeConfig();

            return _instance;
        }

        private bool _Enabled;
        public bool Enabled {
            get { return _Enabled; }
            set {
                _Enabled = value;
                RaisePropertyChanged();
            }
        }

        private string _ServerUrl;
        public string ServerUrl {
            get { return _ServerUrl; }
            set {
                _ServerUrl = value;
                RaisePropertyChanged();
            }
        }

        private bool _ManualRefreshOnly;
        public bool ManualRefreshOnly {
            get { return _ManualRefreshOnly; }
            set {
                _ManualRefreshOnly = value;
                RaisePropertyChanged();
            }
        }

        private bool _JsonCacheEnabled;
        public bool JsonCacheEnabled {
            get { return _JsonCacheEnabled; }
            set {
                _JsonCacheEnabled = value;
                RaisePropertyChanged();
            }
        }

        private bool _ActorAvatarCacheEnabled;
        public bool ActorAvatarCacheEnabled {
            get { return _ActorAvatarCacheEnabled; }
            set {
                _ActorAvatarCacheEnabled = value;
                RaisePropertyChanged();
            }
        }

        private int _RequestTimeoutSeconds;
        public int RequestTimeoutSeconds {
            get { return _RequestTimeoutSeconds; }
            set {
                _RequestTimeoutSeconds = value;
                RaisePropertyChanged();
            }
        }
    }
}
