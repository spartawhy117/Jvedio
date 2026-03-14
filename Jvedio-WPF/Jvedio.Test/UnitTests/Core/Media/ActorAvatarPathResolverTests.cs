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
            string root = TestBootstrap.CreateTempDirectory("actor-avatar-test");
            using (TestBootstrap.OverridePathManagerPath(nameof(PathManager.ActorAvatarCachePath), root)) {
                string path = ActorAvatarPathResolver.GetAvatarPath("12345", "演员A", ".jpg");
                Assert.AreEqual(Path.Combine(root, "12345.jpg"), path);
            }
        }
    }
}
