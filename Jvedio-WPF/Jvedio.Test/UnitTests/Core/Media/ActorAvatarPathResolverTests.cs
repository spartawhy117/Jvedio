using Jvedio.Core.Global;
using Jvedio.Core.Media;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.IO;

namespace Jvedio.Test.UnitTests.Core.Media
{
    [TestClass]
    public class ActorAvatarPathResolverTests
    {
        [TestMethod]
        public void ActorAvatarPathShouldPreferActorId()
        {
            PathManager.ActorAvatarCachePath = Path.Combine(Path.GetTempPath(), "actor-avatar-test");
            string path = ActorAvatarPathResolver.GetAvatarPath("12345", "演员A", ".jpg");
            StringAssert.EndsWith(path, Path.Combine("actor-avatar-test", "12345.jpg"));
        }
    }
}
