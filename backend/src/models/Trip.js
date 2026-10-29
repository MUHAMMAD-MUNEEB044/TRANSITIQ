import mongoose from 'mongoose';

const locationHistorySchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const tripSchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    currentLocation: {
      lat: { type: Number, default: 24.8607 },
      lng: { type: Number, default: 67.0011 },
      updatedAt: { type: Date, default: Date.now },
    },
    currentStopIndex: {
      type: Number,
      default: 0,
    },
    delayMinutes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'delayed'],
      default: 'active',
    },
    locationHistory: [locationHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Compound index on Trip: { routeId, status, startTime } for high-performance lookup
tripSchema.index({ routeId: 1, status: 1, startTime: -1 });

const Trip = mongoose.model('Trip', tripSchema);
export default Trip;
