import mongoose from 'mongoose';

export const ATTACHMENT_MAX_SIZE =
  10 * 1024 * 1024; // 10 MB

const attachmentSchema =
  new mongoose.Schema(
    {
      task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true,
        index: true,
      },

      project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true,
      },

      organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true,
      },

      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },

      originalName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 255,
      },

      storedName: {
        type: String,
        required: true,
        unique: true,
      },

      mimeType: {
        type: String,
        required: true,
        trim: true,
      },

      size: {
        type: Number,
        required: true,
        min: 1,
        max: ATTACHMENT_MAX_SIZE,
      },

      storagePath: {
        type: String,
        required: true,
      },
    },

    {
      timestamps: true,
    },
  );

// ------------------------------------------------------------
// Task attachment listing
// ------------------------------------------------------------

attachmentSchema.index({
  task: 1,
  createdAt: -1,
});

// ------------------------------------------------------------
// Organization/project/task isolation
// ------------------------------------------------------------

attachmentSchema.index({
  organization: 1,
  project: 1,
  task: 1,
});

// ------------------------------------------------------------
// Hide internal storage information from API responses
// ------------------------------------------------------------

attachmentSchema.methods.toJSON =
  function toJSON() {
    const attachment =
      this.toObject();

    delete attachment.__v;

    // Never expose the physical storage path
    delete attachment.storagePath;

    // Never expose the internal generated filename
    delete attachment.storedName;

    return attachment;
  };

const Attachment =
  mongoose.model(
    'Attachment',
    attachmentSchema,
  );

export default Attachment;