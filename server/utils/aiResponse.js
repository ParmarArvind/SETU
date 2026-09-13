export const sendAISuccess = ({
  res,
  statusCode = 200,
  taskId,
  operation,
  result,
  provider,
  model,
}) => {
  return res.status(statusCode).json({
    success: true,
    data: {
      taskId,
      operation,
      result,
      provider,
      model,
    },
  });
};

export const sendAIError = ({
  res,
  statusCode = 500,
  code = 'AI_ERROR',
  message = 'An AI error occurred.',
  provider,
}) => {
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (provider) {
    response.error.provider = provider;
  }

  return res.status(statusCode).json(response);
};