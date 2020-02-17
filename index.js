const util = require('util');
const urlParse = require('url').parse;
const randomstring = require('randomstring');

const fs = require('fs')
const path = require('path')
const Promise = require('bluebird')
const OSS = require('ali-oss').Wrapper
const utils = require('./utils')

const baseStore = require('ghost-storage-base')

class OssStore extends baseStore {
  constructor (config) {
    super(config)
    this.options = config || {}
    this.client = new OSS(this.options)
  }

  save (file, targetDir) {
    const client = this.client
    const origin = this.options.origin  
    const key = this.getFileKey(file)

    return new Promise(function (resolve, reject) {
      return client.put(
        key, 
        fs.createReadStream(file.path)
      )
      .then(function (result) {
        // console.log(result)
        if(origin){
          resolve(utils.joinUrl(origin, result.name))
        }else{
          resolve(result.url)
        }      
      })
      .catch(function (err) {
        // console.log(err)
        reject(false)
      })
    })
  }

  exists (filename) {
    // console.log('exists',filename)
    const client = this.client  
  
    return new Promise(function (resolve, reject) {
      return client.head(filename).then(function (result) {
        // console.log(result)
        resolve(true)
      }).catch(function (err) {
        // console.log(err)
        reject(false)
      })
  
    })
  }
  
  serve (options) {  
    return function (req, res, next) {
      next();
    }
  }
  
  delete (filename) {
    const client = this.client  
  
    // console.log('del',filename)
    return new Promise(function (resolve, reject) {
      return client.delete(filename).then(function (result) {
        // console.log(result)
        resolve(true)
      }).catch(function (err) {
        // console.log(err)
        reject(false)
      })
    })
  }

  read (options) {
    options = options || {}

    const client = this.client;
    const key = urlParse(options.path).pathname.slice(1)

    return new Promise(function(resolve, reject) {
      return client.get(key).then(function(result) {
        resolve(result.content)
      }).catch(function (err) {
        reject(err)
      })
    })
  }
 
  getFileKey (file) {
    const keyOptions = this.options.fileKey
  
    if (keyOptions) {
      const getValue = function (obj) {
        return typeof obj === 'function' ? obj() : obj
      };
      const ext = path.extname(file.name)
      const name = path.basename(file.name, ext)
  
      if (keyOptions.safeString) {
        name = utils.safeString(name)
      }
  
      if (keyOptions.prefix) {
        name = path.join(keyOptions.prefix, name);
      }

      if (keyOptions.folderByDate){
        const now = new Date()
        const month = now.getMonth()
        const dateDir = `${now.getFullYear()}${month < 10 ? '0' + month : month }`
        name = path.join(dateDir, name);
      }
  
      if (keyOptions.suffix) {
        name += getValue(keyOptions.suffix)
      }

      if (keyOptions.filenameWithRandam) {
        name += '-' + randomstring.generate({
          length: 8,
          charset: 'alphanumeric',
          capitalization: 'lowercase'
        })
      }

      return name + ext.toLowerCase();
    }
  
    return null;
  }
}

module.exports = OssStore
