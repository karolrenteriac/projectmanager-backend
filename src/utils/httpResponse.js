function error(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function forbidden(res, message = "Access denied") {
  return res.status(403).json({ success: false, message });
}

function unauthorized(res, message = "Unauthorized") {
  return res.status(401).json({ success: false, message });
}

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

function notFound(res, message = "Not found") {
  return res.status(404).json({ success: false, message });
}

module.exports = {
  error,
  forbidden,
  unauthorized,
  badRequest,
  notFound,
};
