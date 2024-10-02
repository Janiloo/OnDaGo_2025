using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Bson;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OnDaGO.MAUI.Models
{
    public class FareMatrixItem
    {
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }
        public string Origin { get; set; }
        public string Destination { get; set; }
        public decimal Fare { get; set; }
        public decimal DiscountedFare { get; set; }
    }

}

