const fetchBuffer = (url) => fetch(url).then((r) => r.arrayBuffer());

export default async (ctx, obj) => {
  const db = await new Promise((r) => {
    const req = indexedDB.open("assets", 1);
    req.addEventListener("upgradeneeded", (e) => {
      const db = e.target.result;
      db.createObjectStore("audiobuffers");
      r(db);
    });
    req.addEventListener("success", (e) => r(e.target.result));
  });
  const getTable = () =>
    db.transaction("audiobuffers", "readwrite").objectStore("audiobuffers");
  const check = (key) =>
    new Promise((resolve, reject) => {
      const request = getTable().count(key);
      request.addEventListener("success", ({ target: { result } }) =>
        result > 0 ? resolve(result) : reject("Key not known")
      );
      request.addEventListener("error", reject);
    });
  const get = (key) =>
    new Promise((resolve, reject) => {
      const request = getTable().get(key);
      request.addEventListener("success", ({ target: { result } }) =>
        result ? resolve(result) : reject("empty result")
      );
      request.addEventListener("error", reject);
    });
  const put = (key, value) =>
    new Promise((resolve, reject) => {
      const request = getTable().put(value, key);
      request.addEventListener("success", resolve);
      request.addEventListener("error", reject);
    });
  return Object.fromEntries(
    await Promise.all(
      Object.entries(obj).map(async ([key, url]) => [
        key,
        await check(url)
          .catch(() => fetchBuffer(url).then((buffer) => put(url, buffer)))
          .then(() => get(url))
          .then((buffer) => ctx.decodeAudioData(buffer)),
      ])
    )
  );
};
