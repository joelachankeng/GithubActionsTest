const axios = require("axios");
const sampleJSON = require("./data/sample.json");

const notify = [
  "joelachankeng@gmail.com",
  "anthonyh@marriner.com",
  "normanb@marriner.com",
  "marshallk@marriner.com",
];

const WP_URL = "https://mfi.marriner.com/";
// const WP_URL = "https://michaelfoods.com/";

var allItems = [];
var rejected = [];
var counter = 0;

runMigration()
  .then(() => {
    console.log(`Migration completed!`, counter, "/", allItems.ids.length);
    console.log("Errors", rejected.length, "counts");
    rejected.forEach((r) => {
      console.log(
        r.id,
        "Status:",
        r.error.response.status,
        "Response:",
        r.error.response.data
      );
    });
  })
  .catch((error) => console.log(error));

async function runMigration() {
  const getAllItems = await axios.get(
    WP_URL.concat(
      "wp-admin/admin-ajax.php?action=get_fse_migration_request_product_total&postID=5"
    )
  );

  //   allItems = sampleJSON;
  allItems = getAllItems.data;

  const promises = [];

  const collectMessages = [];

  // split data into chunks
  const spliceItems = chunkify([...allItems.ids.splice(0, 20)], 10);

  for (let index = 0; index < spliceItems.length; index++) {
    const chunk = spliceItems[index];

    console.log("Migrating chunk " + index);
    chunk.forEach((i, chunkIndex) => {
      promises.push(
        new Promise(async (resolve) => {
          await axios
            .get(
              WP_URL.concat(
                `wp-admin/admin-ajax.php?action=get_fse_migration_wordpress_request&postID=5&skuID=${i[0]}`
              )
            )
            .then((response) => {
              //   console.log(counter, `${i[0]} was successfully migrated.`);
              const msg = response.data[0][0];
              console.log(counter, msg);
              collectMessages.push(msg);
              counter += 1;
              resolve(i);
            })
            .catch((error) => {
              const msg = `${i[0]} had an error!`;
              console.log(counter, msg);
              collectMessages.push(msg);
              rejected.push({
                id: i[0],
                error: error,
              });
              resolve(error);
            });
        })
      );
    });
    await Promise.all(promises).then((results) => {});
    await timeout(1000);
  }

  // send Email
  var data = new URLSearchParams();
  data.append("action", "get_fse_migration_notification_request");
  data.append("emailArr", notify);
  data.append("msg", collectMessages);

  await axios
    .post(WP_URL.concat("wp-admin/admin-ajax.php"), data)
    .then(async function (response) {
      console.log("Email sent successfully!");
    })
    .catch(function (error) {
      console.log("ERROR: EMAIL FAILED TO SEND!", error.response.data);
    });
}

function timeout(delay) {
  return new Promise((res) => setTimeout(res, delay));
}
function chunkify(anArray, size) {
  const cloneArray = [...anArray];
  let arrays = [];
  while (cloneArray.length > 0) arrays.push(cloneArray.splice(0, size));
  return arrays;
}
