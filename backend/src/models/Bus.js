import mongoose from 'mongoose';

const busSchema = new mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    capacity: {
      type: Number,
      default: 45,
    },
    currentDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
    },
    currentRoute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      default: null,
    },
    currentLocation: {
      lat: { type: Number, default: 24.8607 },
      lng: { type: Number, default: 67.0011 },
      speed: { type: Number, default: 0 },
      heading: { type: Number, default: 0 },
      updatedAt: { type: Date, default: Date.now },
    },
    status: {
      type: String,
      enum: ['available', 'on_route', 'delayed', 'break', 'offline'],
      default: 'available',
    },
    isSimulated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Bus = mongoose.model('Bus', busSchema);
export default Bus;
