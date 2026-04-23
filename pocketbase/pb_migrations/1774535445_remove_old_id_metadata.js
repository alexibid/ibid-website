/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);

  const pages = dao.findRecordsByFilter("pages", "metadata ~ 'old_id'");

  for (const page of pages) {
    const metadata = page.get("metadata") || {};
    
    if (metadata.old_id !== undefined) {
      if (metadata.location === undefined || metadata.location === "") {
        metadata.location = String(metadata.old_id);
      }
      delete metadata.old_id;
    }

    page.set("metadata", metadata);
    dao.saveRecord(page);
  }
}, (db) => {
})
