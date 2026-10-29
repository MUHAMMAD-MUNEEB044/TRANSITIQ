import mongoose from 'mongoose';

const routeStopSchema = new mongoose.Schema(
  {
    stopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
    expectedDuration: {
      type: Number, // in minutes
      default: 5,
    },
  },
  { _id: false }
);

const waypointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    stopName: { type: String, default: null },
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    startLocation: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    stops: [routeStopSchema],
    waypoints: [waypointSchema], // Coordinate array for polyline & GPS simulation
    totalDistance: {
      type: Number, // in km
      default: 15.0,
    },
    estimatedDuration: {
      type: Number, // in minutes
      default: 40,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    colorCode: {
      type: String,
      default: '#38BDF8', // Accent blue
    },
  },
  {
    timestamps: true,
  }
);

const Route = mongoose.model('Route', routeSchema);
export default Route;
