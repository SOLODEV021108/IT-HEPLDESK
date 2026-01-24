export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN
  const GITHUB_OWNER = 'SOLODEV021108'
  const GITHUB_REPO = 'IT-HEPLDESK'

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GitHub token not configured on server' })
  }

  // GET: Fetch issues
  if (req.method === 'GET') {
    try {
      const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/master/issues.json`
      const response = await fetch(url)
      
      if (response.status === 404) {
        return res.status(200).json([])
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch issues: ${response.status}`)
      }
      
      const issues = await response.json()
      return res.status(200).json(issues)
    } catch (error) {
      console.error('Error fetching issues:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  // POST: Save issues
  if (req.method === 'POST') {
    try {
      const { issues } = req.body
      
      if (!issues) {
        return res.status(400).json({ error: 'No issues provided' })
      }

      const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/issues.json`
      
      // Get current file to get SHA
      let sha = null
      try {
        const getResponse = await fetch(url, {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        })
        if (getResponse.ok) {
          const data = await getResponse.json()
          sha = data.sha
        }
      } catch (e) {
        console.log('File does not exist yet, will create new')
      }

      // Prepare content
      const content = Buffer.from(JSON.stringify(issues, null, 2)).toString('base64')
      
      const body = {
        message: `Updated issues - ${new Date().toLocaleString('en-IN')}`,
        content: content
      }

      if (sha) {
        body.sha = sha
      }

      // Save to GitHub
      const putResponse = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!putResponse.ok) {
        const error = await putResponse.json()
        console.error('GitHub Save Error:', error)
        return res.status(putResponse.status).json({ error: error.message || 'Failed to save to GitHub' })
      }

      return res.status(200).json({ success: true, message: 'Issue saved successfully' })
    } catch (error) {
      console.error('Error saving issue:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
