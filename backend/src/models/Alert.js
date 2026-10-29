import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      default: null,
    },
    stopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
      default: null,
    },
    type: {
      type: String,
      enum: ['delay', 'closure', 'cancellation', 'announcement'],
      default: 'announcement',
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
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

// Query index for active unexpired alerts
alertSchema.index({ isActive: 1, expiresAt: 1, createdAt: -1 });

const Alert = mongoose.model('Alert', alertSchema);
export default Alert;
