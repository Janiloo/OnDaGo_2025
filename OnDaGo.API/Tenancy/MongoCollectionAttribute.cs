using System;

namespace OnDaGo.API.Tenancy
{
    /// <summary>Maps a tenant entity type to its MongoDB collection name.</summary>
    [AttributeUsage(AttributeTargets.Class)]
    public class MongoCollectionAttribute : Attribute
    {
        public string Name { get; }
        public MongoCollectionAttribute(string name) => Name = name;
    }
}
