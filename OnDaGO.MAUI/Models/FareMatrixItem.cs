using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OnDaGO.MAUI.Models
{
    public class FareMatrixItem
    {
        public string Id { get; set; } // Use string for Id since ObjectId might not be needed here
        public string Origin { get; set; }
        public string Destination { get; set; }
        public decimal Fare { get; set; }
        public decimal DiscountedFare { get; set; }
    }
}

