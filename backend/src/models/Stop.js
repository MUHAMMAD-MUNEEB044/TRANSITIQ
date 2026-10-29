import mongoose from 'mongoose';

const stopSchema = new mongoose.Schema(
  {
    stopName: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      // GeoJSON format: [longitude, latitude]
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    routeIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route',
      },
    ],
    stopOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index on Stop.location for geospatial queries ($near, $geoWithin)
stopSchema.index({ location: '2dsphere' });

const Stop = mongoose.model('Stop', stopSchema);
export default Stop;
