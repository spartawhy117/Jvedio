using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace Jvedio
{
    public static class StyleManager
    {
        public static BitmapSource BackgroundImage { get; set; }

        public static FontFamily GlobalFont { get; set; }

        public static string[] FontExt { get; set; } = new[] { ".otf", ".ttf" };

        public static class Common
        {
            public static class HighLight
            {
                public static SolidColorBrush Background =>
                    GetBrush("Common.HighLight.Background", Colors.Transparent);

                public static SolidColorBrush BorderBrush =>
                    GetBrush("Common.HighLight.BorderBrush", Colors.Transparent);

                private static SolidColorBrush GetBrush(string resourceKey, Color fallback)
                {
                    object value = Application.Current?.Resources?[resourceKey];
                    if (value is SolidColorBrush brush)
                        return brush;
                    return new SolidColorBrush(fallback);
                }
            }
        }
    }
}
