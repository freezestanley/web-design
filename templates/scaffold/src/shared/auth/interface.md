# 查询应用状态及账号访问权限

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /openapi/app-projects/{projectNo}/permission:
    get:
      summary: 查询应用状态及账号访问权限
      deprecated: false
      description: |-
        查询应用状态及账号访问权限
        返回应用上下线状态和账号是否在权限范围内，优先级判断由调用方处理
      tags:
        - studio/应用项目开放 API
      parameters:
        - name: projectNo
          in: path
          description: 项目唯一标识
          required: true
          example: PROJvsckxrdidyscu
          schema:
            type: string
        - name: account
          in: query
          description: 待查询账号
          required: true
          example: za-rongjie001
          schema:
            type: string
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
                $ref: '#/components/schemas/ResultAppProjectPermissionVO'
          headers: {}
          x-apifox-name: ''
      security: []
      x-apifox-folder: studio/应用项目开放 API
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/7977925/apis/api-478860488-run
components:
  schemas:
    ResultAppProjectPermissionVO:
      type: object
      properties:
        data:
          $ref: '#/components/schemas/AppProjectPermissionVO'
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
    AppProjectPermissionVO:
      type: object
      properties:
        projectNo:
          type: string
          description: 项目唯一标识
        appStatus:
          type: string
          description: 应用状态：ONLINE / OFFLINE
        hasPermission:
          type: boolean
          description: 当前账号是否在权限范围内（不含上下线判断，由调用方决定优先级）
      x-apifox-orders:
        - projectNo
        - appStatus
        - hasPermission
      x-apifox-ignore-properties: []
      x-apifox-folder: ''
  securitySchemes: {}
servers: []
security: []

```