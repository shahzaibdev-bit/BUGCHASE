import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  /** Optional rich HTML body (used for saved email notifications). */
  html: {
    type: String,
    default: '',
  },
  /** Source channel that produced this notification. */
  channel: {
    type: String,
    enum: ['in_app', 'email'],
    default: 'in_app',
  },
  type: {
    type: String,
    enum: ['announcement', 'bounty', 'system', 'payment'],
    default: 'system',
  },
  /** In-app deep link (e.g. /researcher/reports/:id) */
  link: String,
  read: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
