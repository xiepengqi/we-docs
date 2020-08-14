import axios from 'axios'

const http = axios.create({
  baseURL: process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : null,
  timeout: 60000
})

export default {
  get: (url, params) => http({
    url: url,
    params,
    method: 'get'
  }),
  post: (url, data) => http({
    url: url,
    data,
    method: 'post'
  })
}

