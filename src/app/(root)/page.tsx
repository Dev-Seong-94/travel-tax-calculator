import { DEFAULT_LOCALE } from "@/i18n/locales";

const target = `/${DEFAULT_LOCALE}/`;

// A static export has no server redirects, so hosts that do not apply
// public/_redirects fall back to this page.
export default function RootRedirectPage() {
  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${target}`} />
      <a href={target}>계산기로 이동</a>
    </>
  );
}
