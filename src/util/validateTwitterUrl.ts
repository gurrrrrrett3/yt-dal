export default function validateTwitterUrl(input: string): boolean {
  const url = new URL(input);

  console.log(url, url.host, url.pathname);

  const hosts = [
    "twitter.com",
    "www.twitter.com",
    "mobile.twitter.com",
    "m.twitter.com",
    "x.com",
    "www.x.com",
    "mobile.x.com",
  ];

  if (!hosts.includes(url.host)) return false;

  const paths = url.pathname.split("/");
  if (paths[2] !== "status") return false;

  return true;
}
