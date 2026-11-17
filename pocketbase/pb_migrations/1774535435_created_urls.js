migrate((db) => {
  const collection = new Collection({
    "id": "z886csivggtfkha",
    "created": "2026-03-26 14:30:35.255Z",
    "updated": "2026-03-26 14:30:35.255Z",
    "name": "urls",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "qpr5j1z1",
        "name": "url",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": true,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "vh4dvlpk",
        "name": "page_id",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "xcmbvrw26p81y08",
          "cascadeDelete": true,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": []
        }
      },
      {
        "system": false,
        "id": "lbxjxocp",
        "name": "lang",
        "type": "text",
        "required": false,
        "presentable": false,
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
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("z886csivggtfkha");

  return dao.deleteCollection(collection);
})
