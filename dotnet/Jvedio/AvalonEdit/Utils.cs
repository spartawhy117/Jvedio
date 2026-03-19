using ICSharpCode.AvalonEdit;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace Jvedio.AvalonEdit
{
    public class Utils
    {
        public static void GotFocus(object sender)
        {
            if (sender is FrameworkElement ele && ele.Parent is Border border) {
                object value = Application.Current?.Resources?["Button.Selected.BorderBrush"];
                border.BorderBrush = value as SolidColorBrush ?? Brushes.Transparent;
            }
        }

        public static void LostFocus(object sender)
        {
            if (sender is FrameworkElement ele && ele.Parent is Border border) {
                border.BorderBrush = Brushes.Transparent;
            }
        }
    }
}
