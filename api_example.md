http://4335314-za-aigc-harness-studio.test.za.biz 

# 项目概览列表

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /app-center/projects:
    get:
      summary: 项目概览列表
      deprecated: false
      description: 项目概览列表
      tags:
        - studio/应用中心
      parameters:
        - name: status
          in: query
          description: 状态过滤：ONLINE / OFFLINE（不传则查全部）
          required: false
          schema:
            type: string
        - name: query
          in: query
          description: 模糊查询：匹配应用名称 / 应用描述 / 分享链接
          required: false
          schema:
            type: string
        - name: pageNum
          in: query
          description: 页码，默认 1
          required: false
          example: 1
          schema:
            type: integer
            format: int64
            default: 1
        - name: pageSize
          in: query
          description: 页大小，默认 20
          required: false
          example: 20
          schema:
            type: integer
            format: int64
            default: 20
        - name: x-service-name
          in: header
          description: ''
          required: false
          example: '{{x-service-name}}'
          schema:
            type: string
            default: '{{x-service-name}}'
        - name: x-usercenter-session
          in: header
          description: ''
          required: false
          example: '{{x-usercenter-session}}'
          schema:
            type: string
            default: '{{x-usercenter-session}}'
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ResultPageListAppProjectItemVO'
          headers: {}
          x-apifox-name: ''
      security: []
      x-apifox-folder: studio/应用中心
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7977925/apis/api-477673636-run
components:
  schemas:
    ResultPageListAppProjectItemVO:
      type: object
      properties:
        data:
          $ref: '#/components/schemas/PageListAppProjectItemVO'
          description: ''
        code:
          type: string
          description: ''
        success:
          type: boolean
          description: ''
        message:
          type: string
          description: ''
        serverTime:
          type: integer
          description: ''
          format: int64
        sessionId:
          type: string
          description: ''
        requestId:
          type: string
          description: ''
        additions:
          type: object
          properties: {}
          description: ''
          x-apifox-orders: []
          x-apifox-ignore-properties: []
        traceId:
          type: string
          description: ''
        duration:
          type: integer
          description: ''
          format: int64
      x-apifox-orders:
        - data
        - code
        - success
        - message
        - serverTime
        - sessionId
        - requestId
        - additions
        - traceId
        - duration
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    PageListAppProjectItemVO:
      type: object
      properties:
        pageSize:
          type: integer
          description: ''
          format: int64
        pageNum:
          type: integer
          description: ''
          format: int64
        totalCount:
          type: integer
          description: ''
          format: int64
        data:
          type: array
          items:
            $ref: '#/components/schemas/AppProjectItemVO'
            description: 应用项目响应 VO
          description: ''
      x-apifox-orders:
        - pageSize
        - pageNum
        - totalCount
        - data
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
    AppProjectItemVO:
      type: object
      properties:
        projectNo:
          type: string
          description: 项目唯一标识
        projectName:
          type: string
          description: 应用名称
        projectDesc:
          type: string
          description: 应用描述
        status:
          type: string
          description: 状态：ONLINE / OFFLINE
        statusName:
          type: string
          description: 状态名称：上线中 / 已下线
        shareUrl:
          type: string
          description: 分享链接（已下线时为 null）
        gmtCreated:
          type: string
          description: 创建时间
          x-apifox-mock: '@datetime'
      x-apifox-orders:
        - projectNo
        - projectName
        - projectDesc
        - status
        - statusName
        - shareUrl
        - gmtCreated
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes: {}
servers: []
security: []

```