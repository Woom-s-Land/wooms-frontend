import basicAxios from '../libs/axios/basicAxios';

const getComment = async (woomsId, page) => {
  const data = await basicAxios({
    method: 'get',
    url: `comments/wooms/${woomsId}?page=${page}`,
  })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      throw err;
    });
  return data;
};

const postComment = async (woomsId, content) => {
  const data = await basicAxios({
    method: 'post',
    url: `/comments/wooms/${woomsId}`,
    data: {
      content: content,
    },
  })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      throw err;
    });
  return data;
};

const getCommentToday = async (woomsId) => {
  const data = await basicAxios({
    method: 'get',
    url: `/comments/wooms/${woomsId}/today`,
  })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      throw err;
    });
  return data;
};

const getStory = async (woomsId, page) => {
  const data = await basicAxios({
    method: 'get',
    url: `/wooms/${woomsId}/stories?page=${page}`,
  })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      throw err;
    });
  return data;
};

const postStory = async (woomsId, userNickname, content) => {
  const data = await basicAxios({
    method: 'post',
    url: `/wooms/${woomsId}/stories`,
    data: {
      userNickname: userNickname,
      content: content,
    },
    withCredentials: true,
  })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      throw err;
    });
  return data;
};

const postPhoto = async (woomsId, mapId, imageFile) => {
  const formData = new FormData();
  formData.append('mapId', mapId);
  formData.append('summary', '');
  formData.append('image', imageFile);

  try {
    const response = await basicAxios({
      method: 'post',
      url: `wooms/${woomsId}/photos`,
      data: formData,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

const getPhotoMonth = async (woomsId, page) => {
  const data = await basicAxios({
    method: 'get',
    url: `wooms/${woomsId}/photos/month?page=${page}`,
  })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      throw err;
    });
  return data;
};

const getPhoto = async (woomsId, page, date) => {
  const data = await basicAxios({
    method: 'get',
    url: `/wooms/${woomsId}/photos?page=${page}`,
    params: {
      date: date,
    },
  })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      throw err;
    });
  return data;
};

const getPhotoDetail = async (woomsId, photoId) => {
  const data = await basicAxios({
    method: 'get',
    url: `wooms/${woomsId}/photos/${photoId}`,
  })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      throw err;
    });
  return data;
};

const patchPhoto = async (woomsId, photoId) => {
  const data = await basicAxios({
    method: 'patch',
    url: `wooms/${woomsId}/photos/${photoId}`,
  })
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      throw err;
    });
  return data;
};

const GroupCommentApi = {
  getComment,
  postComment,
  getCommentToday,
};

const GroupStoryApi = {
  getStory,
  postStory,
};

const GroupPhotoApi = {
  postPhoto,
  getPhoto,
  getPhotoMonth,
  getPhotoDetail,
  patchPhoto,
};

export { GroupCommentApi, GroupPhotoApi, GroupStoryApi };
