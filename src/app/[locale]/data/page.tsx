import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { labelFromSnapshotPath, PUBLIC_VIEWS, snapshotObjectName } from "@/lib/data/export";
import { readCachedSnapshots } from "@/lib/data/register";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "DataPage" });
  return { title: t("title"), description: t("description") };
}

export default async function DataPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("DataPage");
  const snapshots = await readCachedSnapshots();

  return (
    <article>
      <header className="intro">
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>

      <h2>{t("downloadsTitle")}</h2>
      <ul className="index">
        <li>
          <a href="/data/register.json" download="register.json">{t("jsonLabel")}</a>
        </li>
        <li>
          <a href="/data/hashes.txt" download="hashes.txt">{t("hashesLabel")}</a>
        </li>
      </ul>

      <h2>{t("csvTitle")}</h2>
      <ul className="index">
        {PUBLIC_VIEWS.map((view) => (
          <li key={view}>
            <a href={`/data/${view}.csv`} download={`${view}.csv`}>{t(`views.${view}`)}</a>
          </li>
        ))}
      </ul>

      <h2>{t("verifyTitle")}</h2>
      <p>{t("verifyBody")}</p>
      <pre><code>{t("verifyCommand")}</code></pre>

      <h2>{t("snapshotsTitle")}</h2>
      {snapshots === null ? <p>{t("notConfigured")}</p> : null}
      {snapshots?.length === 0 ? <p>{t("notCompiled")}</p> : null}
      {snapshots && snapshots.length > 0 ? (
        <div className="table-scroll">
          <table>
            <caption>{t("snapshotsTitle")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("date")}</th>
                <th scope="col">{t("hash")}</th>
                <th scope="col">{t("previous")}</th>
                <th scope="col">{t("file")}</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((row) => {
                const objectName = snapshotObjectName(row.storagePath);
                const label = labelFromSnapshotPath(row.storagePath) ?? row.storagePath;
                return (
                  <tr key={row.id}>
                    <td>{label}</td>
                    <td><code className="data-hash">{row.sha256}</code></td>
                    <td>{row.prevSha256 ? <code className="data-hash">{row.prevSha256}</code> : t("none")}</td>
                    <td>
                      {objectName ? (
                        <a href={`/data/snapshots/${objectName}`} download={objectName}>{objectName}</a>
                      ) : row.storagePath}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </article>
  );
}
