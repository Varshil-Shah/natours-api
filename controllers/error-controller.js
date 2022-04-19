const AppError = require('../utils/app-error');

const handleCastErrorDB = (error) => {
  const message = `Invalid value ${error.value} for attribute ${error.path}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (error) => {
  const value = error.keyValue;
  const message = `Duplicate field value(s) for ${JSON.stringify(
    value
  )}.Please use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (error) => {
  const errors = Object.values(error.errors).map(
    (ele, index) => `${index + 1}) ${ele.message}`
  );
  const message = `Invalid input data for: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const sendErrorDevelopment = (error, res) => {
  res.status(error.statusCode).json({
    status: error.status,
    message: error.message,
    stack: error.stack,
    error: error,
  });
};

const sendErrorProduction = (error, res) => {
  // OPERATIONAL, TRUSTED ERRROR - SEND MESSAGE TO CLIENT
  if (error.isOperational) {
    res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
    });

    // PROGRAMMING ERRROR OR OTHER UNKNOWN ERRROR - DON'T LEAK
  } else {
    // eslint-disable-next-line no-console
    console.error(`ERRROR 💣 ${error}`);

    // SEND GENERIC RESPONSE
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong :(',
    });
  }
};

module.exports = (error, req, res, next) => {
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDevelopment(error, res);
  } else if (process.env.NODE_ENV === 'production') {
    let err = { ...error };
    err.name = error.name;

    if (err.name === 'CastError') err = handleCastErrorDB(err);
    if (err.code === 11000) err = handleDuplicateFieldsDB(err);
    if (err.name === 'ValidationError') err = handleValidationErrorDB(err);

    sendErrorProduction(err, res);
  }
  next();
};
