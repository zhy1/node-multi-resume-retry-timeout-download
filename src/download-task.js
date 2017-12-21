/**
 * Created by zy on 2017/10/14.
 */
import fs from 'fs';
import eFetch from 'node-fetch-try';
import path from 'path';
import os from 'os';
import urlfun from 'url';
import Immutable from 'immutable';
import fsExtra from 'fs-extra';


/**
 * download task
 */
export default class DownloadTask {
  constructor(data) {
    this._downloadUrl = /(http|ftp|https):\/\/([\w.]+\/?)\S*/.test(data.downloadUrl) ? data.downloadUrl : "http://" + data.downloadUrl;
    this._savePath = data.savePath;
    this._name = data.name;
    this._saveName = data.saveName;

    this._fileSize = 0;
    this._currentSize = 0;
    this._totalSize = data.totalSize;
    this._process = 0;
    this._result = false;

    this._registerTime = new Date().valueOf();
    this._completeTime = null;
    this._pauseTime = false; // control pause
    this._startTime = false; // control start

    this._method = data.method;
    this._requestOptions = Immutable.Map(data.opt).set('method', data.method).toJS() // request query


    // 不断点下载阀值 1m default
    this._capacity = data.capacity || 1 * 1024 * 1024;
    this._pipeSize = data.pipeSize || 1 * 1024 * 1024;

    this._file;  // file stream
    this._resultCb;   // result call back setting
    this._processCb;   // process call back setting

    this._pie;  // pipe connect
    this._fd;   // file description
    this._fileSavePath; // real  file save path
    this._type = data.type; // if equals map save to local database

    // console.info(this);
    return this;
  }

  //curring
  processCommonCb(fn) {
    // debugger;
    // console.info(fn)
    const _that = this;
    // const args = [].slice.call(arguments, 1);
    return function () {
      // debugger;
      // console.info(fn)
      const processData = [].slice.call(arguments);
      if (_that._downloadUrl === processData[2]) {
        _that._currentSize = processData[0];
        _that._totalSize = processData[1];
        _that._process = parseFloat((_that._currentSize / _that._totalSize * 100).toFixed(2));
        // console.info([processData, _that._process, _that._downloadUrl]);
        // console.info(_that._currentSize, _that._totalSize, _that._process);
        // return dispatch(fn.apply(null, [processData, _that._process, _that._downloadUrl]));
        // return dispatch(fn.bind(processData, _that, _that._process, _that._downloadUrl));
        // return dispatch(fn);
        // return dispatch.apply(null, fn.bind([processData, _that, _that._process, _that._downloadUrl]));
        // fn.bind(null,processData)
        // return dispatch.apply(null, fn);
        return fn(processData);
      }
    };
  }


  //curring
  resultCommonCb(fn) {
    // debugger;
    // console.info(fn)
    const _that = this;
    // const args = [].slice.call(arguments, 1);
    return function () {
      // debugger;
      // console.info(fn)
      // const newArgs = args.concat([].slice.call(arguments));
      const downloadResult = [].slice.call(arguments);
      const result = downloadResult[0];
      _that._result = result;
      _that._completeTime = new Date().valueOf();

      // 保护性设置任务已经完成
      _that._process = 100;

      // console.info(newArgs);
      // return fn.apply(null, newArgs);
      // return dispatch(fn.bind(newArgs, _that));
      // return dispatch(fn);
      // return fn([].slice.call(arguments)[0]);
      return fn(result);
    };
  }


  downloadDetail() {
    // debugger;
    this._savePath = this._savePath || process.resourcesPath || null;
    this._fileSavePath = this._saveName ? this._savePath + path.sep + this._saveName : this._savePath;
    return new Promise((resolve, reject) => {
      // debugger; 用于查看入参正确性和保存地址是否有问题
      if (!this._savePath) {
        this._code = 6;
        this._msg = "savePath保存路径为空!";
        reject(this);
      } else {
        fsExtra.ensureDir(this._savePath, () => {
          fs.lstat(this._savePath, (err, stats) => {
            // debugger;
            if (err) {
              console.info("读取路径/文件异常 =" + err);
              if (err.errno === -2 || err.errno === -4058 || err.message.indexOf(`no such file or directory`) > 0)
                console.info("文件不存在,创建就好啦 -> " + err.message);
              else {
                this._err = err;
                reject(this);
              }
            }
            const newName = (url) => {
              const pathArray = url.split('/');
              const pathName = pathArray[pathArray.length - 1];
              const queryArray = pathName.split('?');
              const queryName = queryArray[queryArray.length - 1];
              return queryName.replace('&', '');
            }
            if (!err && stats.isDirectory() && (!this._saveName || this._saveName.replace(/\ /g, "") === "")) {// 如果目录不存在 err.errno
              this._saveName = newName(this._downloadUrl);
              this._fileSavePath = this._savePath + path.sep + this._saveName;
            }
            eFetch(this._downloadUrl, {method: 'HEAD'}).then(headRes => {
              //console.info("获得请求head =" + JSON.stringify(headRes));
              const h = headRes.headers;
              ////console.info(h);
              const contentLength = h._headers && ( Number(h._headers['content-length'] || h._headers['Content-Length']));
              const acceptRanges = h._headers && (h._headers['accept-ranges'] || h._headers['Accept-Ranges'])
              // file read
              // this._fd = fs.openSync(this._fileSavePath + path.sep + this._saveName, 'a+')
              // const currentFileSize = fs.statSync(this._fileSavePath + path.sep + this._saveName).size
              try {
                this._fd = fs.openSync(this._fileSavePath, 'a+')
                this._currentFileSize = fs.statSync(this._fileSavePath).size || 0;
              } catch (e) {
                console.info("文件不存在，可以从开始下载")
              }
              if (!this._currentFileSize || typeof this._currentFileSize === 'undefined') {
                console.info(this._currentFileSize);
              }
              //console.info(`文件大小 : ${formatFileSting(contentLength)} 容量大小${formatFileSting(capacity)}`)
              if (this._currentFileSize > 0 && this._currentFileSize === contentLength) {
                this._status = "已下载";
                this._msg = "已存在同样的文件";
                this._code = 3;
                this._contentLength = contentLength;
                return resolve(this);
                // return (delete urlList[requestUrl]);
              } else if (this._currentFileSize > 0 && this._currentFileSize > contentLength) {
                this._status = "已下载";
                this._msg = "已存在更大的文件";
                this._code = 4;
                this._contentLength = contentLength;
                return resolve(this);
                // return (delete urlList[requestUrl]);
              } else if (!contentLength || contentLength > 0 && contentLength <= this._capacity) {
                eFetch(this._downloadUrl, this._requestOptions).then(res => {
                  ////console.info(res.body);
                  if (res && res.body) {
                    this._file = fs.createWriteStream(this._fileSavePath, {
                      flags: 'a'
                    })
                    this._pie = res.body.pipe(this._file);
                    if (this._pie.on)
                      this._pie.on('close', (err) => {
                        this._status = "下载完成";
                        this._code = 0;
                        this._msg = "读取返回体时流数据出错";
                        this._contentLength = contentLength;
                        resolve(this);
                        return fs.close(this._fd, a => a);
                        // delete urlList[url];
                        // return (delete urlList[requestUrl]);
                      })
                    else {
                      this._status = "错误";
                      this._code = 1;
                      this._msg = "读取返回体时流数据出错";
                      this._contentLength = contentLength;
                      reject(this);
                      return fs.close(this._fd, a => a);
                      // return (delete urlList[requestUrl]);
                    }
                  } else {
                    this._contentLength = contentLength;
                    this._status = "错误";
                    this._code = 2;
                    this._msg = "请求返回值异常";
                    reject(this);
                    return fs.close(this._fd, a => a);
                    // return (delete urlList[requestUrl]);
                  }
                })
              } else {
                const resolve1 = resolve;
                const downloadFileByChunk = (begin, end) => {
                  // debugger;
                  if (this && this.isPause) {
                    console.info("暂停了本次下载");
                    return;
                    // return (delete urlList[requestUrl]);
                  }
                  //console.info("即将下载 : " + formatFileSting(begin) + " - " + formatFileSting(end));
                  return eFetch(this._downloadUrl, Object.assign(this._requestOptions || {}, {headers: {Range: `bytes=${begin}-${end}`}}))
                    .then(res => {
                      if (res && res.body) {
                        //console.info(`开始保存 : ${formatFileSting(begin)} - ${formatFileSting(end)}`);
                        this._file = fs.createWriteStream(this._fileSavePath, {
                          flags: 'a'
                        })
                        this._pie = res.body.pipe(this._file)
                        if (this._pie.on) {
                          this._pie.on('close', (err) => {
                            this._processCb && this._processCb(end, contentLength, this._downloadUrl);
                            if (end >= contentLength) {
                              this._status = "下载完成";
                              this._begin = begin;
                              this._end = end;
                              this._code = 0;
                              this._contentLength = contentLength;
                              resolve1(this);
                              // delete urlList[url];
                              fs.close(this._fd, () => {
                              });
                            } else if ((end + this._pipeSize) > contentLength) {
                              return downloadFileByChunk(end + 1, contentLength)
                            } else {
                              return downloadFileByChunk(end + 1, end + 1 + this._pipeSize)
                            }
                          })
                        } else {
                          console.info('pipe 流验证失败')
                        }
                      }
                    })// then 无法接受到值
                }
                const currentFileSizeNew = this._currentFileSize > 0 ? this._currentFileSize + 1 : 0;
                if ((currentFileSizeNew + this._pipeSize ) > contentLength)
                  return downloadFileByChunk(currentFileSizeNew, contentLength)
                else
                  return downloadFileByChunk(currentFileSizeNew, currentFileSizeNew + this._pipeSize)
              }
            })
          })
        })
      }
    })
  }


  /**
   * 如果什么都不传会返回promise
   * @param processCb
   * @param resultCb
   * @returns {*|Promise<any>|Promise.<T>}
   */
  start(processCb, resultCb) {
    this._startTime = new Date().valueOf();
    this._pauseTime = false;
    if (typeof processCb === 'function') {
      this._processCb = this.processCommonCb(processCb);
    }
    if (typeof resultCb === 'function') {
      this._resultCb = resultCb;
    }
    // this.downloadDetail();

    if (processCb && resultCb) {
      return this.downloadDetail()
        .then(this.resultCommonCb(resultCb))
        .catch(error => console.info("pipe download file failed" + error))
    } else if (!processCb && resultCb) {
      return this.downloadDetail()
        .then(this.resultCommonCb(resultCb))
        .catch(error => console.info("pipe download file failed" + error))
    } else if (!processCb && !resultCb) {
      return this.downloadDetail()
    }
  }

  pause() {
    this._startTime = false;
    return this._pauseTime = new Date().valueOf();
  }


  get isPause() {
    return !!this._pauseTime;
  }

  get isStart() {
    return !!this._startTime;
  }

  get url() {
    return this._downloadUrl;
  }

  get path() {
    return this._savePath;
  }

  get name() {
    return this._saveName;
  }

  get current() {
    return this._currentSize;
  }

  get total() {
    return this._totalSize;
  }

  get time() {
    return this._registerTime;
  }

  get process() {
    return this._process;
  }

  get type() {
    return this._type
  }

  get file() {
    return this._fileSavePath;
  }


}
