export function notFound(_req, res, _next) 
{
    res.status(404).json({ error: "Not Found" });
}

export function errorHandler(err, _req, res, _next) 
{
    const status = res.statusCode !== 200 ? res.statusCode : 500;
    res.status(status).json({ error: err.message || "Server Error" });
}