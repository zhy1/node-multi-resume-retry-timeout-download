# node-multi-resume-retry-downloader

a new method download http data in multiple, resume, retry.


> download-task-list

> [{downloadTask},{downloadTask},{downloadTask}]



## How to Install

> shell
```shell

npm i --save node-multi-resume-retry-timeout-download
npm i -d

```

> js

```javascript
const DownloadTask = require('node-mutil-downloader').DownloadTask;
const DownloadTaskList = require('node-mutil-downloader').DownloadTaskList;

```
OR SEE test

## How To Use

```javascript



const downloadTaskList  = new DownloadTaskList();
downloadTask = new DownloadTask({
    downloadUrl,
    savePath
});
downloadTaskList.register(downloadTask);
downloadTaskList.startDownloadTask(downloadTask, index, progressCatch(dispatch, getState), downloadResultHandler(dispatch, getState));


```




## Use In Redux

```javascript

reducers

function downloadTaskList(state = {
  list: new DownloadTaskList(),
  trigger: 'init'
}, action = {}) {
  switch (action.type) {
    case types.UPDATE_LIST:
      return {
        list: action.list,
        time: action.time
      };
    case types.CLEAR_LIST:
      return {
        list: action.list,
        time: action.time
      };
    case types.REMOVE_DOWNLOAD:
      return {
        list: action.list,
        time: action.time
      };
    case types.DOWNLOAD_PROGRESS:
      return {
        trigger: action.trigger,// progress || finish
        list: action.list,
        time: action.time
      };
    default:
      return state
  }
}


handlers:

function progressCatch(dispatch) {
  const getState = [].slice.call(arguments, 1)[0];
  return function () {
    const downloadTaskList = getState().downloadTaskList.list;
    return dispatch(downloadProgressUpdate(downloadTaskList, "progress"));
  }
}


function processMapFileAction(file,directory) {
  return async (dispatch, getState) => {
    const mapInfo = await mapUtils.analysisMapTarGz(file,directory);
    mapInfo.time = new Date().valueOf();
    await mapUtils.saveMapMetaToDB(mapInfo);
    return dispatch(choseMap(mapInfo));
  }
}


caller:

    const downloadTaskList = getState().downloadTaskList.list;
    const downloadTask = new DownloadTask({
      type,
      downloadUrl,
      savePath,
      saveName
    });
    downloadTaskList.register(downloadTask);
    downloadTask.start(progressCatch(dispatch, getState), downloadResultHandler(dispatch, getState));
  
  
  
```
