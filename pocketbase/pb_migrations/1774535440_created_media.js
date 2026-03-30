/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "media_collection_id",
    "name": "media",
    "type": "base",
    "system": false,
    "schema": [
      {
        "name": "file",
        "type": "file",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "maxSize": 5242880,
          "mimeTypes": ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"],
          "thumbs": ["100x100", "800x0", "1600x0"]
        }
      },
      {
        "name": "alt",
        "type": "text",
        "required": false,
        "presentable": true,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("media");
  return dao.deleteCollection(collection);
})
