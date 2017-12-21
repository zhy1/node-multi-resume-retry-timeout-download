/**
 * Created by zy on 2017/10/14.
 */

export default class DownloadTaskList {
  constructor(data) {
    if (data)
      this._downloadTaskList = data.downloadTaskList;
    this._downloadTaskList = this._downloadTaskList || [];
    // return this;
  }

  /**
   * add
   * @param task
   * @returns {boolean}
   */
  register(task, cb) {
    this.add(task, cb);
  }

  /**
   * add
   * @param task
   * @returns {boolean}
   */
  add(task, cb) {
    const matchCondition = this._downloadTaskList.filter(listTask => listTask.url === task.url)
    const noDuplicate = !(matchCondition && matchCondition.length)
    if (noDuplicate) {
      this._downloadTaskList.push(task);
      cb && cb();
    }
    return noDuplicate;
  }

  /**
   * delete
   * @param task
   */
  remove(task) {
    // debugger;
    this._lastRemoveTask = this._downloadTaskList.filter(listTask => listTask.url === task.url)[0];
    if (this._lastRemoveTask) {
      this._lastRemoveTask.pause();
    }
    this._downloadTaskList = this._downloadTaskList.filter(listTask => listTask.url !== task.url);
    return this;
  }

  /**
   * start
   * @param task
   * @param index
   * @param processCb
   * @param resultCb
   * @returns {Array}
   */
  startDownloadTask(task, index, processCb, resultCb) {
    if (index) {
      return this._downloadTaskList[index].start(processCb, resultCb)
    }
    if (task) {
      return this._downloadTaskList.map(listTask => {
        if (listTask.url === task.url)
          return listTask.start(processCb, resultCb);
      })
    }
  }

  /**
   * pause
   * @param task
   * @param index
   * @returns {Array}
   */
  pause(task, index) {
    if (index) {
      return this._downloadTaskList[index].pause();
    }
    if (task) {
      return this._downloadTaskList.map(listTask => {
        if (listTask.url === task.url)
          listTask.pause();
      })
    }
  }

  /**
   * get
   * @returns {*|Array}
   */
  get list() {
    return (this._downloadTaskList && this._downloadTaskList._downloadTaskList) || this._downloadTaskList;
  }


  get downloadTaskList() {
    return this._downloadTaskList;
  }


  /**
   * task map convert
   * @returns {{}}
   */
  getTaskMap() {
    const map = {};
    this._downloadTaskList.map(task => {
      map[task.url] = task;
    })
    return map;
  }


}
