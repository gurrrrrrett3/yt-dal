import { Router } from "express";
import ytdl from "ytdl-core";
import validateTwitterUrl from "../util/validateTwitterUrl";
import errorRedirect from "../util/errorRedirect";
const router = Router();

router.get("/redirect", (req, res) => {
  const { input, ext, i } = req.query;


  if (!input) {
    errorRedirect(res, "No URL provided");
    return;
  }

  // youtube

  if (ytdl.validateURL(input as string) || ytdl.validateID(input as string)) {
    try {
      const id = ytdl.getVideoID(input as string);
      if (!id) {
        errorRedirect(res, "Invalid Video ID");
        return;
      }

      res.redirect(`/yt/${id}.${ext}` + (i == "true" ? "?i=true" : ""));
    } catch (err) {
      errorRedirect(res, "Failed to parse URL");
      return;
    }

    // twitter
  } else if (validateTwitterUrl(input as string)) {
    const url = new URL(input as string);
    const paths = url.pathname.split("/");

    const username = paths[1];
    const id = paths[3];

    res.redirect(`/tw/${username}/${id}.${ext}` + (i == "true" ? "?i=true" : ""));

    // other
  } else {
    errorRedirect(res, "Invalid URL. We don't support this site (yet)");
    return;
  }
});

export default router;
