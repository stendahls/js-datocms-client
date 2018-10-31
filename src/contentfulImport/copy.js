import appClient from './appClient';
import getContentfulData from './getContentfulData';
import destroyExistingModels from './destroyExistingModels';
import destroyExistingAssets from './destroyExistingAssets';
import removeAllValidators from './removeAllValidators';
import setLocales from './setLocales';
import createModels from './createModels';
import createFields from './createFields';
import createRecords from './createRecords';
import addValidationsOnField from './addValidationsOnField';
import linkRecords from './linkRecords';
import createUploads from './createUploads';

export default async (contentfulToken, contentfulSpaceId, datoCmsToken) => {
  const client = await appClient(contentfulToken, contentfulSpaceId, datoCmsToken);
  const datoClient = client.dato;
  const contentfulData = await getContentfulData(client.contentful);

  await removeAllValidators({ datoClient, contentfulData });

  await destroyExistingModels({ datoClient, contentfulData });

  await destroyExistingAssets({ datoClient, contentfulData });

  await setLocales({ datoClient, contentfulData });

  const itemTypes = await createModels({ datoClient, contentfulData });
  const fields = await createFields({ itemTypes, datoClient, contentfulData });

  const contentfulRecordMap = await createRecords({
    itemTypes,
    fields,
    datoClient,
    contentfulData,
  });

  await addValidationsOnField({
    itemTypes, fields, datoClient, contentfulData,
  });
  await linkRecords({
    itemTypes,
    fields,
    datoClient,
    contentfulData,
    contentfulRecordMap,
  });

  await createUploads({
    fields,
    itemTypes,
    datoClient,
    contentfulData,
    contentfulRecordMap,
  });
};
