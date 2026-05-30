import axios from "axios";
import * as cheerio from "cheerio";
import { HttpsProxyAgent } from "https-proxy-agent";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // creds are only used in this request, its never written to database or logs
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing credentials" });

  // creds are passed directly to this proxy (iitm proxy) to authorize (again, not stored)
  const proxyUrl = `https://${encodeURIComponent(username)}:${encodeURIComponent(password)}@remote.iitm.ac.in:8372`;
  const agent = new HttpsProxyAgent(proxyUrl);

  const baseHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
  };

  const loginUrl = "https://workflow.iitm.ac.in/student/Authenticate.aspx";
  const gradesUrl = "https://workflow.iitm.ac.in/student/GradeInfo.aspx";

  function extractCookies(headers) {
    const raw = headers["set-cookie"] || [];
    return raw.map((c) => c.split(";")[0]).join("; ");
  }

  try {
    // Step 1: GET login page
    const loginPageRes = await axios.get(loginUrl, {
      httpsAgent: agent,
      headers: baseHeaders,
      maxRedirects: 5,
      validateStatus: () => true,
    });

    let cookies = extractCookies(loginPageRes.headers);
    const $ = cheerio.load(loginPageRes.data);

    const field = (name) => $(`input[name="${name}"]`).val() || "";

    // captcha is just plain text in a <span> in the html (ig they didnt care too much)
    const captcha = $("#Spncaptcha").text().trim();

    if (!captcha) return res.status(500).json({ error: "Could not read captcha" });

    // Step 2: POST login
    const params = new URLSearchParams({
      ScriptManager1_HiddenField: field("ScriptManager1_HiddenField"),
      __EVENTTARGET: "",
      __EVENTARGUMENT: "",
      __VIEWSTATE: field("__VIEWSTATE"),
      __VIEWSTATEGENERATOR: field("__VIEWSTATEGENERATOR"),
      __EVENTVALIDATION: field("__EVENTVALIDATION"),
      txtUserName: username,
      PNReqE_ClientState: "",
      txtPassword: password,
      ValidatorCalloutExtender1_ClientState: "",
      HiddenCaptcha: captcha,
      txtCaptcha: captcha,
      vceCaptcha_ClientState: "",
      Login: "Login",
    });

    const loginRes = await axios.post(loginUrl, params.toString(), {
      httpsAgent: agent,
      headers: {
        ...baseHeaders,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookies,
      },
      maxRedirects: 0,
      validateStatus: () => true,
    });

    // Merge any new cookies from login response
    const newCookies = extractCookies(loginRes.headers);
    if (newCookies) cookies = cookies + "; " + newCookies;

    // Follow redirect manually if needed
    let redirectUrl = loginRes.headers["location"];
    if (redirectUrl) {
      if (!redirectUrl.startsWith("http")) {
        redirectUrl = "https://workflow.iitm.ac.in/student/" + redirectUrl.replace(/^\.\//, "");
      }
      const redirectRes = await axios.get(redirectUrl, {
        httpsAgent: agent,
        headers: { ...baseHeaders, Cookie: cookies },
        maxRedirects: 5,
        validateStatus: () => true,
      });
      const redirectCookies = extractCookies(redirectRes.headers);
      if (redirectCookies) cookies = cookies + "; " + redirectCookies;
    }

    // Step 3: GET grades page
    const gradesRes = await axios.get(gradesUrl, {
      httpsAgent: agent,
      headers: { ...baseHeaders, Cookie: cookies },
      maxRedirects: 5,
      validateStatus: () => true,
    });

    // Step 4: Parse grades
    const $g = cheerio.load(gradesRes.data);
    const grades = [];
    const allRows = $g("#G_ctl00xMainContentxuwgCourseDetails tbody tr");
    const rows = $g("#G_ctl00xMainContentxuwgCourseDetails tbody tr");
    rows.each((i, row) => {
      const firstRow = $g(rows[1]);
      const firstCols = firstRow.find("td");
      const cols = $g(row).find("td");
      if (cols.length < 8) return;
      const text = (col) => $g(col).find("nobr").text().replace(/\u00a0/g, "").trim();
      const courseNo = text(cols[0]);
      if (!courseNo) return; // skip empty rows
      grades.push({
        courseNo,
        courseName: text(cols[1]),
        semester:   text(cols[2]),
        category:   text(cols[3]),
        type:       text(cols[4]),
        credit:     text(cols[5]),
        grade:      text(cols[6]),
        attendance: text(cols[7]),
      });
    });

    //only the parsed grade data is returned, no creds, ne sessions, nothing :)
    return res.status(200).json({ grades });
  } catch (err) {
    console.error("Error:", err?.message);
    return res.status(500).json({ error: err?.message || "Something went wrong" });
  }
}