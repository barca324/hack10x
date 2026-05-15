const fs = require('fs')
const csv = require('csv-parser')

/**
 * bulkUpload.js
 *
 * Parse a CSV file uploaded via Multer.
 * Expected CSV columns: name, email, roleApplied, resumeUrl (optional)
 *
 * @param {string} filePath - absolute path to the uploaded CSV file
 * @returns {Promise<Array<{name, email, roleApplied, resumeUrl}>>}
 */
function parseBulkCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = []

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const { name, email, roleApplied, resumeUrl, jdUrl } = row
        if (!name || !email || !roleApplied) return // skip incomplete rows
        results.push({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          roleApplied: roleApplied.trim(),
          resumeUrl: resumeUrl ? resumeUrl.trim() : '',
          jdUrl: jdUrl ? jdUrl.trim() : ''
        })
      })
      .on('end', () => {
        // Clean up uploaded file after parsing
        fs.unlink(filePath, () => {})
        resolve(results)
      })
      .on('error', (err) => {
        fs.unlink(filePath, () => {})
        reject(err)
      })
  })
}

module.exports = { parseBulkCSV }
