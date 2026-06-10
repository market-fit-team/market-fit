const getCookie = (name: string) => {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1]
}

export const withCsrfHeaders = (headers?: HeadersInit): Headers => {
  const requestHeaders = new Headers(headers)
  const csrfToken = getCookie("XSRF-TOKEN")

  if (csrfToken) {
    requestHeaders.set("X-XSRF-TOKEN", decodeURIComponent(csrfToken))
  }

  return requestHeaders
}
