#!/bin/bash

# Get the docker assigned address of the host and insert it into the hosts file for use by UDF API mocks
printf "\n`getent ahostsv4 host.docker.internal | grep STREAM | awk '{ print $1 ; exit }'` metadata.udf" | sudo tee -a /etc/hosts

curl --retry 12 --retry-all-errors -X PUT 'http://host.docker.internal:5123/mockserver/expectation' \
-H 'Content-Type: text/json; charset=utf-8' \
-d @- <<'EOF'
{
    "httpRequest": {
        "method": "GET",
        "path": "/labinfo"
    },
    "httpResponse": {
        "body": {
            "LabID": "87sdf8HDJSDH66asdg",
            "dataPlaneKey": "YXJlYWxseWxvbmd2YWx1ZWhlcmU=",
            "description": "NGINX One Lab",
            "ns": false,
            "nsRoles": {
                "group_names": null,
                "namespace_roles": [
                    {
                        "namespace": "default",
                        "role": "arolenamehere"
                    }
                ]
            },
            "site": true,
            "siteStatic": null,
            "sqsQueue": "reallylongstringhere",
            "sqsURL": "https://reallylongurlhere.io",
            "tenant": "tenantnamehere",
            "tenantURL": "https://tenanturlhere.io",
            "token": null
        }
    }
}
EOF

curl -X PUT 'http://host.docker.internal:5123/mockserver/expectation' \
-H 'Content-Type: text/json; charset=utf-8' \
-d @- <<'EOF'
{
    "httpRequest": {
        "method": "GET",
        "path": "/petname"
    },
    "httpResponse": {
        "body": {
            "petname":"happy-sloth"
        }
    }
}
EOF

curl --retry 12 --retry-all-errors -X PUT 'http://metadata.udf:80/mockserver/expectation' \
-H 'Content-Type: text/json; charset=utf-8' \
-d @- <<'EOF'
{
    "httpRequest": {
        "method": "GET",
        "path": "/deployment"
    },
    "httpResponse": {
        "body": {
            "deployment": {
                "id": "9ffca59b-7bd1-4375-8c5e-27198ff21f6c",
                "host": "deployment.access.udf.f5.com",
                "publicIp": "12.34.56.78",
                "deployer": "j.seinfeld@f5.com",
                "region": "us-east4",
                "components": [
                    {
                        "id": "0cd74e44-90fc-4220-96fe-4c1b1cf1502e",
                        "name": "Runner",
                        "osName": "Ubuntu 22.04 LTS Server",
                        "mgmtIp": "10.1.1.5",
                        "trafficIps": [],
                        "accessMethods": {
                            "ssh": [
                                {
                                    "host": "host1.access.udf.f5.com",
                                    "port": 47000,
                                    "internalIp": "10.1.1.5",
                                    "internalPort": 22,
                                    "parameters": {
                                        "username": "ubuntu"
                                    },
                                    "label": "SSH"
                                }
                            ],
                            "https": [
                                {
                                    "host": "host2.access.udf.f5.com",
                                    "port": 443,
                                    "internalIp": "10.1.1.5",
                                    "internalPort": 47100,
                                    "parameters": {
                                        "ssl": false
                                    },
                                    "label": "Web Shell"
                                },
                                {
                                    "host": "host3.access.udf.f5.com",
                                    "port": 443,
                                    "internalIp": "10.1.1.5",
                                    "internalPort": 1337,
                                    "parameters": {
                                        "unauthenticated": false,
                                        "ssl": false
                                    },
                                    "label": "Lab App"
                                }
                            ]
                        },
                        "userTags": [
                            {
                                "name": "XC",
                                "value": "runner"
                            },
                            {
                                "name": "LabID",
                                "value": "166b515795c84d6096bcad78dcabb098"
                            }
                        ]
                    },
                    {
                        "id": "582906b6-87d5-491f-baea-fa4e0652633f",
                        "name": "F5 Distributed Cloud CE",
                        "osName": "F5 Distributed Cloud Customer Edge (Centos)",
                        "mgmtIp": "10.1.1.4",
                        "trafficIps": [],
                        "accessMethods": {
                            "https": [
                                {
                                    "host": "host1.access.udf.f5.com",
                                    "port": 443,
                                    "internalIp": "10.1.1.4",
                                    "internalPort": 65500,
                                    "parameters": {
                                        "ssl": true
                                    },
                                    "label": "Site UI"
                                }
                            ]
                        },
                        "userTags": [
                            {
                                "name": "XC",
                                "value": "CE"
                            }
                        ]
                    }
                ]
            }
        }
    }
}
EOF

curl -X PUT 'http://metadata.udf:80/mockserver/expectation' \
-H 'Content-Type: text/json; charset=utf-8' \
-d @- <<'EOF'
{
    "httpRequest": {
        "method": "GET",
        "path": "/userTags/name/XC/value/runner"
    },
    "httpResponse": {
        "body": [
            {
                "id": "0cd74e44-90fc-4220-96fe-4c1b1cf1502e",
                "name": "Runner",
                "osName": "Ubuntu 22.04 LTS Server",
                "mgmtIp": "10.1.1.5",
                "trafficIps": [],
                "accessMethods": {
                "ssh": [
                    {
                        "host": "host1.access.udf.f5.com",
                        "port": 47000,
                        "internalIp": "10.1.1.5",
                        "internalPort": 22,
                        "parameters": {
                            "username": "ubuntu"
                        },
                        "label": "SSH"
                    }
                ],
                "https": [
                    {
                        "host": "host2.access.udf.f5.com",
                        "port": 443,
                        "internalIp": "10.1.1.5",
                        "internalPort": 47100,
                        "parameters": {
                            "ssl": false
                        },
                        "label": "Web Shell"
                    },
                    {
                        "host": "host3.access.udf.f5.com",
                        "port": 443,
                        "internalIp": "10.1.1.5",
                        "internalPort": 1337,
                        "parameters": {
                            "unauthenticated": false,
                            "ssl": false
                        },
                        "label": "Lab App"
                    }
                ]
                },
                "userTags": [
                    {
                        "name": "XC",
                        "value": "runner"
                    },
                    {
                        "name": "LabID",
                        "value": "lab_id_here"
                    }
                ]
            }
        ]
    }
}
EOF


curl -X PUT 'http://metadata.udf:80/mockserver/expectation' \
-H 'Content-Type: text/json; charset=utf-8' \
-d @- <<'EOF'
{
    "httpRequest": {
        "method": "GET",
        "path": "/cloudAccounts"
    },
    "httpResponse": {
        "body": {
            "cloudAccounts": [
                {
                "accountId": "account_id_here",
                "cloudAccountId": ""cloud_account_id_here",
                "credentials": [
                    {
                        "secret": "secret_here",
                        "key": "key_here",
                        "type": "AWS_API_CREDENTIAL"
                    },
                    {
                        "password": "password_here",
                        "username": "username_here",
                        "type": "AWS_CONSOLE_CREDENTIAL"
                    }
                ],
                "apiSecret": "api_secret_here",
                "apiKey": "api_key_here",
                "consolePassword": "password_here",
                "consoleUsername": "username_here",
                "provider": "AWS",
                "regions": [
                    "ap-northeast-1",
                    "ap-northeast-2",
                    "ap-south-1",
                    "ap-southeast-1",
                    "ap-southeast-2",
                    "ca-central-1",
                    "eu-central-1",
                    "eu-west-1",
                    "eu-west-2",
                    "eu-west-3",
                    "sa-east-1",
                    "us-east-1",
                    "us-east-2",
                    "us-west-1",
                    "us-west-2"
                ],
                "services": [
                    "acm",
                    "autoscaling",
                    "cloudformation",
                    "cloudtrail",
                    "cloudwatch",
                    "ec2",
                    "ecr",
                    "ecs",
                    "eks",
                    "elasticloadbalancing",
                    "iam",
                    "kms",
                    "lambda",
                    "logs",
                    "route53",
                    "route53resolver",
                    "s3",
                    "secretsmanager",
                    "serverlessrepo",
                    "sns",
                    "sqs"
                ],
                "roleArn": "role_arn_here",
                "instanceArn": "instance_arn_here"
                }
            ]
        }
    }
}
EOF

curl -X PUT 'http://metadata.udf:80/mockserver/expectation' \
-H 'Content-Type: text/json; charset=utf-8' \
-d @- <<'EOF'
{
    "httpRequest": {
        "method": "GET",
        "path": "/userTags/name/XC/value/CE"
    },
    "httpResponse": {
        "body": [
            {
                "id": "582906b6-87d5-491f-baea-fa4e0652633f",
                "name": "F5 Distributed Cloud CE",
                "osName": "F5 Distributed Cloud Customer Edge (Centos)",
                "mgmtIp": "10.1.1.4",
                "trafficIps": [],
                "accessMethods": {
                "https": [
                    {
                    "host": "host1.access.udf.f5.com",
                    "port": 443,
                    "internalIp": "10.1.1.4",
                    "internalPort": 65500,
                    "parameters": {
                        "ssl": true
                    },
                    "label": "Site UI"
                    }
                ]
                },
                "userTags": [
                {
                    "name": "XC",
                    "value": "CE"
                }
                ]
            }
        ]
    }
}
EOF
