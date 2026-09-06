import mongoose from 'mongoose';

// --------------------------------------------------------------
// Helper: turn "TechCorp Solutions" into "techcorp-solutions"
// Used to auto-generate a URL-safe slug when one isn't provided.
// --------------------------------------------------------------
const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      minlength: [2, 'Organization name must be at least 2 characters'],
      maxlength: [100, 'Organization name must be at most 100 characters'],
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        'Slug may only contain lowercase letters, numbers and hyphens',
      ],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must be at most 500 characters'],
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organization must have an owner'],
    },
  },
  {
    timestamps: true,
  }
);

// --------------------------------------------------------------
// Auto-generate a slug from the name if one wasn't supplied.
// Uniqueness collisions are handled at the controller level
// (catch the duplicate-key error and append a suffix / retry),
// keeping the model itself simple and predictable.
// --------------------------------------------------------------
organizationSchema.pre('validate', function generateSlug() {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }
});

// --------------------------------------------------------------
// Clean output — strip Mongoose internals from API responses.
// --------------------------------------------------------------
organizationSchema.methods.toJSON = function toJSON() {
  const organization = this.toObject();
  delete organization.__v;
  return organization;
};

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;