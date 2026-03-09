using Newtonsoft.Json;
using System;

namespace Jvedio.Core.Scraper.MetaTube
{
    public class MetaTubeApiResponse<T>
    {
        [JsonProperty("data")]
        public T Data { get; set; }

        [JsonProperty("error")]
        public MetaTubeApiError Error { get; set; }
    }

    public class MetaTubeApiError
    {
        [JsonProperty("code")]
        public int Code { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }
    }

    public class MetaTubeProviderInfo
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("provider")]
        public string Provider { get; set; }

        [JsonProperty("homepage")]
        public string Homepage { get; set; }
    }

    public class MetaTubeProvidersResponse
    {
        [JsonProperty("actor_providers")]
        public System.Collections.Generic.Dictionary<string, string> ActorProviders { get; set; }

        [JsonProperty("movie_providers")]
        public System.Collections.Generic.Dictionary<string, string> MovieProviders { get; set; }
    }

    public class MetaTubeMovieSearchResult : MetaTubeProviderInfo
    {
        [JsonProperty("actors")]
        public string[] Actors { get; set; }

        [JsonProperty("cover_url")]
        public string CoverUrl { get; set; }

        [JsonProperty("number")]
        public string Number { get; set; }

        [JsonProperty("release_date")]
        public DateTime ReleaseDate { get; set; }

        [JsonProperty("score")]
        public float Score { get; set; }

        [JsonProperty("thumb_url")]
        public string ThumbUrl { get; set; }

        [JsonProperty("title")]
        public string Title { get; set; }
    }

    public class MetaTubeMovieInfo : MetaTubeMovieSearchResult
    {
        [JsonProperty("big_cover_url")]
        public string BigCoverUrl { get; set; }

        [JsonProperty("big_thumb_url")]
        public string BigThumbUrl { get; set; }

        [JsonProperty("director")]
        public string Director { get; set; }

        [JsonProperty("genres")]
        public string[] Genres { get; set; }

        [JsonProperty("maker")]
        public string Maker { get; set; }

        [JsonProperty("preview_images")]
        public string[] PreviewImages { get; set; }

        [JsonProperty("label")]
        public string Label { get; set; }

        [JsonProperty("runtime")]
        public int Runtime { get; set; }

        [JsonProperty("series")]
        public string Series { get; set; }

        [JsonProperty("summary")]
        public string Summary { get; set; }
    }

    public class MetaTubeActorSearchResult : MetaTubeProviderInfo
    {
        [JsonProperty("images")]
        public string[] Images { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }
    }

    public class MetaTubeActorInfo : MetaTubeActorSearchResult
    {
        [JsonProperty("aliases")]
        public string[] Aliases { get; set; }

        [JsonProperty("birthday")]
        public DateTime Birthday { get; set; }

        [JsonProperty("blood_type")]
        public string BloodType { get; set; }

        [JsonProperty("cup_size")]
        public string CupSize { get; set; }

        [JsonProperty("debut_date")]
        public DateTime DebutDate { get; set; }

        [JsonProperty("height")]
        public int Height { get; set; }

        [JsonProperty("hobby")]
        public string Hobby { get; set; }

        [JsonProperty("skill")]
        public string Skill { get; set; }

        [JsonProperty("measurements")]
        public string Measurements { get; set; }

        [JsonProperty("nationality")]
        public string Nationality { get; set; }

        [JsonProperty("summary")]
        public string Summary { get; set; }
    }
}
