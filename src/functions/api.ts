import express, { Router } from "express";
import serverless from "serverless-http";
import fetch from "node-fetch";

const api = express();
const router = Router();

const { MS_MAIN_URL, MS_LOGIN_URL, MS_LOGIN_EMAIL, MS_LOGIN_PASSWORD } =
  process.env;

if (!MS_MAIN_URL || !MS_LOGIN_URL || !MS_LOGIN_EMAIL || !MS_LOGIN_PASSWORD) {
  throw new Error("Missing environment variables");
}

const reusableHeaders = {
  host: MS_MAIN_URL.replace("https://", ""),
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "cache-control": "no-cache, no-store",
  accept: "*/*",
  "accept-encoding": "gzip, deflate, br",
};

const login = async () => {
  let urlencoded = new URLSearchParams();
  urlencoded.append("action", "login");
  urlencoded.append("login", MS_LOGIN_EMAIL);
  urlencoded.append("password", MS_LOGIN_PASSWORD);

  const response = await fetch(MS_MAIN_URL + MS_LOGIN_URL, {
    headers: {
      ...reusableHeaders,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: urlencoded,
    method: "POST",
  });

  const cookies = response.headers.get("set-cookie")?.split(";");
  const pid = cookies?.[0];
  const cid = cookies?.[1].split(", ")[1];
  const newCookies = pid + "; " + cid;

  console.log(await response.text());

  return newCookies;
};

router.get("*", async (req, res) => {
  const cookie = await login();

  let body = "";
  req
    .on("data", (data) => {
      body += data;
      if (body.length > 1e6) req.connection.destroy();
    })
    .on("end", async () => {
      const response = await fetch(MS_MAIN_URL + req.url, {
        headers: {
          ...reusableHeaders,
          cookie,
        },
        method: req.method,
        body: req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
      });

      res.statusCode = response.status;
      res.end(await response.text());
    });
});

api.use("/", router);
export const handler = serverless(api);
