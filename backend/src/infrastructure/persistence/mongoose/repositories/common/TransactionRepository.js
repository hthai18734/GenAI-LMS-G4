const mongoose = require('mongoose');

class TransactionRepository {
  async run(work, options) {
    return mongoose.connection.transaction(work, options);
  }
}

module.exports = new TransactionRepository();
