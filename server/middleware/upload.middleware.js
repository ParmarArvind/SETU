import multer from 'multer';

import {
  ATTACHMENT_MAX_SIZE,
} from '../models/Attachment.js';

// ------------------------------------------------------------
// Allowed file types
// ------------------------------------------------------------

const ALLOWED_MIME_TYPES =
  new Set([
    // Documents
    'application/pdf',

    'text/plain',

    'text/csv',

    'application/msword',

    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    'application/vnd.ms-excel',

    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

    'application/vnd.ms-powerpoint',

    'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Images
    'image/jpeg',

    'image/png',

    'image/gif',

    'image/webp',

    'image/svg+xml',

    // Archives
    'application/zip',

    'application/x-zip-compressed',

    // JSON / XML
    'application/json',

    'application/xml',

    'text/xml',

    // Web/code files
    'text/css',

    'text/javascript',

    'application/javascript',

    'application/x-javascript',
  ]);

// ------------------------------------------------------------
// Memory storage
//
// File is temporarily kept in memory and then written to
// our controlled uploads directory by the controller.
// ------------------------------------------------------------

const storage =
  multer.memoryStorage();

// ------------------------------------------------------------
// File validation
// ------------------------------------------------------------

const fileFilter = (
  req,
  file,
  callback,
) => {
  if (
    !ALLOWED_MIME_TYPES.has(
      file.mimetype,
    )
  ) {
    return callback(
      new Error(
        'Unsupported file type. Allowed files include PDF, documents, spreadsheets, images, ZIP files, JSON, XML, CSS and JavaScript files.',
      ),
      false,
    );
  }

  callback(
    null,
    true,
  );
};

// ------------------------------------------------------------
// Multer configuration
//
// Maximum:
// 10 MB
//
// Only one file per request.
// ------------------------------------------------------------

const uploadTaskFile =
  multer({
    storage,

    limits: {
      fileSize:
        ATTACHMENT_MAX_SIZE,

      files: 1,
    },

    fileFilter,
  }).single('file');

export {
  uploadTaskFile,
  ALLOWED_MIME_TYPES,
};