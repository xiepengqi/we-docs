import axios from 'axios'

export default axios.create({
  timeout: 60000
})

