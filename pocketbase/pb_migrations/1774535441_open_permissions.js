/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);

  const collections = ["pages", "urls", "media"];

  for (const name of collections) {
    const collection = dao.findCollectionByNameOrId(name);
    collection.listRule = "";
    collection.viewRule = "";
    collection.createRule = "";
    collection.updateRule = "";
    collection.deleteRule = "";
    dao.saveCollection(collection);
  }
}, (db) => {
})
